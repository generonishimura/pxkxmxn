import { StatusConditionProcessorService } from './status-condition-processor.service';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  InMemoryPokemon,
  createInMemoryBattle,
} from '@/modules/pokemon/domain/battle-events/__tests__/in-memory-battle';

describe('StatusConditionProcessorService - 持ち物のターン終了時の効果', () => {
  const setup = (pokemon: InMemoryPokemon) => {
    const battle = createInMemoryBattle(pokemon, { status: { isActive: false } });
    const processor = new StatusConditionProcessorService(
      battle.battleRepository,
      battle.trainedPokemonRepository,
    );
    const processTurnEnd = () => processor.processTurnEndAbilities(battle.context().battle);
    return { ...battle, processTurnEnd };
  };

  beforeEach(() => {
    ItemRegistry.initialize();
  });

  it('たべのこしを持っていると、ターン終了時に最大 HP の 1/16 を回復する', async () => {
    // Arrange
    const { processTurnEnd, get } = setup({
      status: { currentHp: 50, maxHp: 160, persistentState: { item: 'たべのこし' } },
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(get(1).currentHp).toBe(60);
  });

  it('持ち物の回復は、どくのダメージより先に起きる', async () => {
    // Arrange: 95/100 → たべのこしで 100 → どくで 88（後なら 83 → 89 になる）
    const { processTurnEnd, get } = setup({
      status: {
        currentHp: 95,
        maxHp: 100,
        statusCondition: StatusCondition.Poison,
        persistentState: { item: 'たべのこし' },
      },
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(get(1).currentHp).toBe(88);
  });
});
