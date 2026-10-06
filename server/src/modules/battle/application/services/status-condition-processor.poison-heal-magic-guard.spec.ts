import { StatusConditionProcessorService } from './status-condition-processor.service';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';

describe('StatusConditionProcessorService - ポイズンヒール・マジックガード', () => {
  const setup = (pokemon: InMemoryPokemon) => {
    const battle = createInMemoryBattle(pokemon, { status: { isActive: false } });
    const processor = new StatusConditionProcessorService(
      battle.battleRepository,
      battle.trainedPokemonRepository,
    );
    const processTurnEnd = () => processor.processTurnEndAbilities(battle.context().battle);
    return { ...battle, processTurnEnd };
  };

  const withStatus = (
    statusCondition: StatusCondition,
    data: Partial<BattlePokemonStatus> = {},
  ): Partial<BattlePokemonStatus> => ({ statusCondition, ...data });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ポイズンヒールは、ターン終了時のどくのダメージの代わりに最大HPの1/8を回復する', async () => {
    // Arrange
    const { processTurnEnd, get } = setup({
      ability: 'ポイズンヒール',
      status: withStatus(StatusCondition.Poison, { currentHp: 50 }),
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(get(1).currentHp).toBe(62);
  });

  it('ポイズンヒールは、もうどくでもターン数に関係なく最大HPの1/8を回復する', async () => {
    // Arrange
    const { processTurnEnd, get } = setup({
      ability: 'ポイズンヒール',
      status: withStatus(StatusCondition.BadPoison, { currentHp: 30 }),
    });

    // Act
    await processTurnEnd();
    await processTurnEnd();

    // Assert
    expect(get(1).currentHp).toBe(54);
  });

  it('ポイズンヒールでも、やけどのダメージは受ける', async () => {
    // Arrange
    const { processTurnEnd, get } = setup({
      ability: 'ポイズンヒール',
      status: withStatus(StatusCondition.Burn),
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(get(1).currentHp).toBe(94);
  });

  it.each([StatusCondition.Poison, StatusCondition.BadPoison, StatusCondition.Burn])(
    'マジックガードは、ターン終了時の %s のダメージを受けない',
    async status => {
      // Arrange
      const { processTurnEnd, get } = setup({
        ability: 'マジックガード',
        status: withStatus(status),
      });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(100);
    },
  );
});
