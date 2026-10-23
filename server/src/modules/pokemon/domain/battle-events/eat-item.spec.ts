import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { ItemRegistry } from '../items/item-registry';
import { createInMemoryBattle } from './__tests__/in-memory-battle';
import { eatItem, isBerry } from './eat-item';

describe('eat-item', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('isBerry', () => {
    it.each(['オボンのみ', 'ラムのみ', 'ヒメリのみ', 'オッカのみ', 'ホズのみ'])(
      '%s はきのみ',
      itemName => {
        // Act
        const result = isBerry(itemName);

        // Assert
        expect(result).toBe(true);
      },
    );

    it.each(['たべのこし', 'しろいハーブ', 'メンタルハーブ', 'きあいのタスキ'])(
      '%s はきのみではない',
      itemName => {
        // Act
        const result = isBerry(itemName);

        // Assert
        expect(result).toBe(false);
      },
    );

    it('持ち物がなければ、きのみではない', () => {
      // Act
      const result = isBerry(undefined);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('eatItem', () => {
    it('きのみを使い切って、きのみの効果を起こす', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { currentHp: 10, maxHp: 100, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(35);
      expect(get(1).persistentState.item).toBeUndefined();
      expect(get(1).persistentState.consumedItem).toBe('オボンのみ');
      expect(messages).toEqual(['オボンのみ restored its HP!']);
    });

    it('食べるきっかけは見ない（HP が満タンでもオボンのみを食べる）', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeDefined();
      expect(get(1).persistentState.consumedItem).toBe('オボンのみ');
    });

    it('状態異常を治すきのみは、食べたときに治す', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { statusCondition: StatusCondition.Burn, persistentState: { item: 'ラムのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(get(1).statusCondition).toBe(StatusCondition.None);
      expect(messages).toEqual(['ラムのみ cured its burn!']);
    });

    it('きのみでない持ち物は食べない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { persistentState: { item: 'たべのこし' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeUndefined();
      expect(get(1).persistentState.item).toBe('たべのこし');
    });

    it('持ち物の効果が消されている（さしおさえ）なら食べない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { volatileState: { embargoTurns: 3 }, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeUndefined();
      expect(get(1).persistentState.item).toBe('オボンのみ');
    });
  });
});
