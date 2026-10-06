import { StatusConditionProcessorService } from './status-condition-processor.service';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';

describe('StatusConditionProcessorService - 状態異常の特性フック', () => {
  const setup = (pokemon: InMemoryPokemon) => {
    const battle = createInMemoryBattle(pokemon, { status: { isActive: false } });
    const processor = new StatusConditionProcessorService(
      battle.battleRepository,
      battle.trainedPokemonRepository,
    );
    const processTurnEnd = () => processor.processTurnEndAbilities(battle.context().battle);
    return { ...battle, processTurnEnd };
  };

  const poisoned = (data: Partial<BattlePokemonStatus> = {}): Partial<BattlePokemonStatus> => ({
    statusCondition: StatusCondition.Poison,
    ...data,
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('preventsIndirectDamage（マジックガード）', () => {
    it('どくのターン終了時ダメージを受けない', async () => {
      // Arrange
      AbilityRegistry.register('テストマジックガード', { preventsIndirectDamage: true });
      const { processTurnEnd, get } = setup({
        ability: 'テストマジックガード',
        status: poisoned(),
      });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(100);
    });

    it('特性がなければ、どくのダメージ（最大HPの1/8）を受ける', async () => {
      // Arrange
      const { processTurnEnd, get } = setup({ status: poisoned() });

      // Act
      await processTurnEnd();

      // Assert
      expect(get(1).currentHp).toBe(88);
    });
  });

  describe('ターン終了時の特性に渡すコンテキスト', () => {
    it('育成ポケモンリポジトリを渡す（相手の特性を調べる効果のため）', async () => {
      // Arrange
      const onTurnEnd = jest.fn(async () => undefined);
      AbilityRegistry.register('テストナイトメア', { onTurnEnd });
      const { processTurnEnd, trainedPokemonRepository } = setup({ ability: 'テストナイトメア' });

      // Act
      await processTurnEnd();

      // Assert
      expect(onTurnEnd).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ trainedPokemonRepository }),
      );
    });
  });
});
