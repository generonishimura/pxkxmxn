import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { ItemRegistry } from '../items/item-registry';
import { applyIndirectDamage } from './indirect-damage';
import { applyStatChanges } from './stat-change';
import { inflictStatus } from './status-infliction';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('バトルイベントから持ち物のフックを呼ぶ', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('inflictStatus → 持ち物の onStatusInflicted', () => {
    it('付与された側の持ち物に、付与後の状態と状態異常と付与元を渡し、メッセージを返す', async () => {
      // Arrange
      const onStatusInflicted = jest.fn().mockResolvedValue('テストのきのみで治った');
      ItemRegistry.register('テストのきのみ', { onStatusInflicted });
      const { context, get } = createInMemoryBattle(
        {},
        { status: { persistentState: { item: 'テストのきのみ' } } },
      );
      const source = { kind: 'move' as const, name: 'でんじは', pokemon: get(1) };

      // Act
      const messages = await inflictStatus(get(2), StatusCondition.Paralysis, context(), {
        source,
      });

      // Assert
      expect(messages).toEqual(['テストのきのみで治った']);
      const [holder, status, passedSource] = onStatusInflicted.mock.calls[0];
      expect(holder.statusCondition).toBe(StatusCondition.Paralysis);
      expect(status).toBe(StatusCondition.Paralysis);
      expect(passedSource).toBe(source);
    });

    it('付与された側の特性（シンクロ）と付与元の特性（どくくぐつ）のあとに呼ぶ', async () => {
      // Arrange
      const order: string[] = [];
      AbilityRegistry.register('テストシンクロ', {
        onStatusInflicted: async () => {
          order.push('target ability');
          return null;
        },
      });
      AbilityRegistry.register('テストどくくぐつ', {
        onInflictStatus: async () => {
          order.push('source ability');
          return null;
        },
      });
      ItemRegistry.register('テストのきのみ', {
        onStatusInflicted: async () => {
          order.push('item');
          return null;
        },
      });
      const { context, get } = createInMemoryBattle(
        { ability: 'テストどくくぐつ' },
        { ability: 'テストシンクロ', status: { persistentState: { item: 'テストのきのみ' } } },
      );

      // Act
      await inflictStatus(get(2), StatusCondition.Poison, context(), {
        source: { kind: 'move', name: 'どくどく', pokemon: get(1) },
      });

      // Assert
      expect(order).toEqual(['target ability', 'source ability', 'item']);
    });

    it('付与元の持ち物は呼ばない', async () => {
      // Arrange
      const onStatusInflicted = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストのきのみ', { onStatusInflicted });
      const { context, get } = createInMemoryBattle({
        status: { persistentState: { item: 'テストのきのみ' } },
      });

      // Act
      await inflictStatus(get(2), StatusCondition.Burn, context(), {
        source: { kind: 'move', name: 'おにび', pokemon: get(1) },
      });

      // Assert
      expect(onStatusInflicted).not.toHaveBeenCalled();
    });
  });

  describe('applyStatChanges → 持ち物の onStatChanged', () => {
    it('ランクが変わった側の持ち物に、変化後の状態と変わった量を渡し、メッセージを返す', async () => {
      // Arrange
      const onStatChanged = jest.fn().mockResolvedValue('テストのハーブで戻った');
      ItemRegistry.register('テストのハーブ', { onStatChanged });
      const { context, get } = createInMemoryBattle(
        {},
        { status: { persistentState: { item: 'テストのハーブ' } } },
      );

      // Act
      const result = await applyStatChanges(
        get(2),
        [{ statType: 'attack', rankChange: -1 }],
        context(),
        { source: { kind: 'ability', name: 'いかく', pokemon: get(1) } },
      );

      // Assert
      expect(result.messages).toEqual(['テストのハーブで戻った']);
      const [holder, applied] = onStatChanged.mock.calls[0];
      expect(holder.attackRank).toBe(-1);
      expect(applied).toEqual([{ statType: 'attack', rankChange: -1 }]);
    });

    it('対象の特性の onStatChanged（まけんき）のあとに呼ぶ', async () => {
      // Arrange
      const order: string[] = [];
      AbilityRegistry.register('テストまけんき', {
        onStatChanged: async () => {
          order.push('ability');
          return null;
        },
      });
      ItemRegistry.register('テストのハーブ', {
        onStatChanged: async () => {
          order.push('item');
          return null;
        },
      });
      const { context, get } = createInMemoryBattle(
        {},
        { ability: 'テストまけんき', status: { persistentState: { item: 'テストのハーブ' } } },
      );

      // Act
      await applyStatChanges(get(2), [{ statType: 'defense', rankChange: -1 }], context());

      // Assert
      expect(order).toEqual(['ability', 'item']);
    });

    it('ランクが変わらなければ呼ばない', async () => {
      // Arrange
      const onStatChanged = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストのハーブ', { onStatChanged });
      const { context, get } = createInMemoryBattle({
        status: { attackRank: -6, persistentState: { item: 'テストのハーブ' } },
      });

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: -1 }], context());

      // Assert
      expect(onStatChanged).not.toHaveBeenCalled();
    });
  });

  describe('applyIndirectDamage → 持ち物の onUpdate', () => {
    it('HP を減らしたあとに、ダメージを受けたポケモンの持ち物の onUpdate を呼ぶ', async () => {
      // Arrange
      const onUpdate = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストのきのみ', { onUpdate });
      const { context, get } = createInMemoryBattle({
        status: { persistentState: { item: 'テストのきのみ' } },
      });

      // Act
      await applyIndirectDamage(get(1), 60, context());

      // Assert
      expect(onUpdate).toHaveBeenCalledTimes(1);
      expect(onUpdate.mock.calls[0][0].currentHp).toBe(40);
    });

    it('ダメージでひんしになったら呼ばない', async () => {
      // Arrange
      const onUpdate = jest.fn().mockResolvedValue(null);
      ItemRegistry.register('テストのきのみ', { onUpdate });
      const { context, get } = createInMemoryBattle({
        status: { persistentState: { item: 'テストのきのみ' } },
      });

      // Act
      await applyIndirectDamage(get(1), 100, context());

      // Assert
      expect(onUpdate).not.toHaveBeenCalled();
    });
  });
});
