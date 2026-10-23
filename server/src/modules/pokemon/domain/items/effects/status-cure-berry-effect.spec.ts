import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { inflictStatus } from '../../battle-events/status-infliction';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ItemRegistry } from '../item-registry';

describe('状態異常を治すきのみ', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  /** 持ち主（ID 2）に状態異常を付与する */
  const inflictOnHolder = async (item: string, status: StatusCondition) => {
    const battle = createInMemoryBattle({}, { status: { persistentState: { item } } });
    const messages = await inflictStatus(battle.get(2), status, battle.context(), {
      source: { kind: 'move', name: 'テスト', pokemon: battle.get(1) },
    });
    return { ...battle, messages };
  };

  describe.each([
    ['クラボのみ', StatusCondition.Paralysis],
    ['カゴのみ', StatusCondition.Sleep],
    ['モモンのみ', StatusCondition.Poison],
    ['モモンのみ', StatusCondition.BadPoison],
    ['チーゴのみ', StatusCondition.Burn],
    ['ナナシのみ', StatusCondition.Freeze],
    ['ラムのみ', StatusCondition.Paralysis],
    ['ラムのみ', StatusCondition.Sleep],
    ['ラムのみ', StatusCondition.BadPoison],
  ])('%s と %s', (item, status) => {
    it('状態異常にされたら、すぐに食べて治す', async () => {
      // Act
      const { get, messages } = await inflictOnHolder(item, status);

      // Assert
      expect(get(2).statusCondition).toBe(StatusCondition.None);
      expect(get(2).persistentState.item).toBeUndefined();
      expect(get(2).persistentState.consumedItem).toBe(item);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain(item);
    });
  });

  describe.each([
    ['クラボのみ', StatusCondition.Burn],
    ['カゴのみ', StatusCondition.Paralysis],
    ['モモンのみ', StatusCondition.Sleep],
    ['チーゴのみ', StatusCondition.Freeze],
    ['ナナシのみ', StatusCondition.Poison],
    ['キーのみ', StatusCondition.Burn],
  ])('%s と %s', (item, status) => {
    it('治せない状態異常なら食べない', async () => {
      // Act
      const { get, messages } = await inflictOnHolder(item, status);

      // Assert
      expect(get(2).statusCondition).toBe(status);
      expect(get(2).persistentState.item).toBe(item);
      expect(messages).toEqual([]);
    });
  });

  it('キーのみは、こんらんにされたら食べて治す', async () => {
    // Act
    const { get, messages } = await inflictOnHolder('キーのみ', StatusCondition.Confusion);

    // Assert
    expect(get(2).volatileState.confusionTurns).toBeUndefined();
    expect(get(2).persistentState.consumedItem).toBe('キーのみ');
    expect(messages[0]).toContain('キーのみ');
  });

  it('ラムのみは、こんらんにされたら食べて治す', async () => {
    // Act
    const { get } = await inflictOnHolder('ラムのみ', StatusCondition.Confusion);

    // Assert
    expect(get(2).volatileState.confusionTurns).toBeUndefined();
    expect(get(2).persistentState.consumedItem).toBe('ラムのみ');
  });

  it('クラボのみは、こんらんにされても食べない', async () => {
    // Act
    const { get } = await inflictOnHolder('クラボのみ', StatusCondition.Confusion);

    // Assert
    expect(get(2).volatileState.confusionTurns).toBeDefined();
    expect(get(2).persistentState.item).toBe('クラボのみ');
  });

  it('ラムのみは、状態異常とこんらんを一度に治す（onUpdate）', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      status: {
        statusCondition: StatusCondition.Poison,
        volatileState: { confusionTurns: 3 },
        persistentState: { item: 'ラムのみ' },
      },
    });

    // Act
    await ItemRegistry.get('ラムのみ')?.onUpdate?.(get(1), context());

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.None);
    expect(get(1).volatileState.confusionTurns).toBeUndefined();
  });

  it('カゴのみは、すでにねむっていれば（ねむる）食べて起き、ねむるのターン数も消す（onUpdate）', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      status: {
        statusCondition: StatusCondition.Sleep,
        persistentState: { item: 'カゴのみ', sleepTurns: 3 },
      },
    });

    // Act
    const message = await ItemRegistry.get('カゴのみ')?.onUpdate?.(get(1), context());

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.None);
    expect(get(1).persistentState.sleepTurns).toBeUndefined();
    expect(message).toContain('カゴのみ');
  });

  it('ナナシのみは、こおりを治したら、動けなかった回数も消す', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      status: {
        statusCondition: StatusCondition.Freeze,
        persistentState: { item: 'ナナシのみ', freezeTurns: 1 },
      },
    });

    // Act
    await ItemRegistry.get('ナナシのみ')?.onUpdate?.(get(1), context());

    // Assert
    expect(get(1).statusCondition).toBe(StatusCondition.None);
    expect(get(1).persistentState.freezeTurns).toBeUndefined();
  });

  it('状態異常がなければ、onUpdate で何もしない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      status: { persistentState: { item: 'ラムのみ' } },
    });

    // Act
    const message = await ItemRegistry.get('ラムのみ')?.onUpdate?.(get(1), context());

    // Assert
    expect(message).toBeNull();
    expect(get(1).persistentState.item).toBe('ラムのみ');
  });
});
