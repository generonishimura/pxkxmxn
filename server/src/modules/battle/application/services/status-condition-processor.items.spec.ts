import { StatusConditionProcessorService } from './status-condition-processor.service';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
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
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
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

  it('ポケモンごとの処理の最後に、持ち物の onUpdate を呼ぶ（特性の onTurnEnd で HP が変わったあと）', async () => {
    // Arrange
    AbilityRegistry.register('テストのHPが減る特性', {
      onTurnEnd: async (pokemon, ctx) => {
        await ctx?.battleRepository?.updateBattlePokemonStatus(pokemon.id, { currentHp: 30 });
      },
    });
    const onUpdate = jest.fn().mockResolvedValue(null);
    ItemRegistry.register('テストのきのみ', { onUpdate });
    const { processTurnEnd } = setup({
      ability: 'テストのHPが減る特性',
      status: { persistentState: { item: 'テストのきのみ' } },
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(onUpdate).toHaveBeenCalledTimes(1);
    expect(onUpdate.mock.calls[0][0].currentHp).toBe(30);
  });

  it('ターン終了時にひんしになったポケモンの持ち物の onUpdate は呼ばない', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue(null);
    ItemRegistry.register('テストのきのみ', { onUpdate });
    const { processTurnEnd } = setup({
      status: {
        currentHp: 1,
        maxHp: 100,
        statusCondition: StatusCondition.Burn,
        persistentState: { item: 'テストのきのみ' },
      },
    });

    // Act
    await processTurnEnd();

    // Assert
    expect(onUpdate).not.toHaveBeenCalled();
  });
});
