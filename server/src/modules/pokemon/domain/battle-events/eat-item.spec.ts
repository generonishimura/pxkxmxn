import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { AbilityRegistry } from '../abilities/ability-registry';
import { ItemRegistry } from '../items/item-registry';
import { createInMemoryBattle } from './__tests__/in-memory-battle';
import { berryEffectMultiplier, eatItem, isBerry, isPinchBerryHp } from './eat-item';

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

  describe('きんちょうかん・じんばいったい（相手がきのみを食べられない）', () => {
    it.each(['きんちょうかん', 'じんばいったい'])(
      '相手の場のポケモンが %s なら、きのみを食べない',
      async abilityName => {
        // Arrange
        const { get, context } = createInMemoryBattle(
          { status: { currentHp: 10, persistentState: { item: 'オボンのみ' } } },
          { ability: abilityName },
        );

        // Act
        const messages = await eatItem(get(1), context());

        // Assert
        expect(messages).toBeUndefined();
        expect(get(1).persistentState.item).toBe('オボンのみ');
        expect(get(1).currentHp).toBe(10);
      },
    );

    it('相手のきんちょうかんがひんしなら、きのみを食べる', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle(
        { status: { persistentState: { item: 'オボンのみ' } } },
        { ability: 'きんちょうかん', status: { currentHp: 0 } },
      );

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeDefined();
    });

    it('相手のきんちょうかんが控えなら、きのみを食べる', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle(
        { status: { persistentState: { item: 'オボンのみ' } } },
        { ability: 'きんちょうかん', status: { isActive: false } },
      );

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeDefined();
    });

    it('自分のきんちょうかんでは、自分のきのみを食べられなくならない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'きんちょうかん',
        status: { persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeDefined();
    });

    it('相手のきんちょうかんが、いえきで消されていれば、きのみを食べる', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle(
        { status: { persistentState: { item: 'オボンのみ' } } },
        { ability: 'きんちょうかん', status: { volatileState: { abilitySuppressed: true } } },
      );

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toBeDefined();
    });
  });

  describe('じゅくせい（きのみの効果が 2 倍）', () => {
    it('オボンのみで、最大 HP の 1/2 を回復する', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'じゅくせい',
        status: { currentHp: 10, maxHp: 100, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      await eatItem(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(60);
    });

    it('オレンのみで、HP を 20 回復する', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'じゅくせい',
        status: { currentHp: 10, maxHp: 100, persistentState: { item: 'オレンのみ' } },
      });

      // Act
      await eatItem(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(30);
    });

    it('berryEffectMultiplier は、じゅくせいなら 2、ほかの特性なら 1', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle(
        { ability: 'じゅくせい' },
        { ability: 'いかく' },
      );

      // Act
      const ripen = await berryEffectMultiplier(get(1), context());
      const other = await berryEffectMultiplier(get(2), context());

      // Assert
      expect(ripen).toBe(2);
      expect(other).toBe(1);
    });
  });

  describe('ほおぶくろ（きのみを食べると HP を回復する）', () => {
    it('きのみを食べたら、きのみの効果に加えて最大 HP の 1/3 を回復する', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'ほおぶくろ',
        status: { currentHp: 10, maxHp: 99, persistentState: { item: 'オボンのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(10 + 24 + 33);
      expect(messages).toEqual(['オボンのみ restored its HP!', 'ほおぶくろ restored its HP!']);
    });

    it('HP が満タンなら、回復のメッセージを出さない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'ほおぶくろ',
        status: { statusCondition: StatusCondition.Burn, persistentState: { item: 'ラムのみ' } },
      });

      // Act
      const messages = await eatItem(get(1), context());

      // Assert
      expect(messages).toEqual(['ラムのみ cured its burn!']);
    });

    it('かいふくふうじ中は回復しない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'ほおぶくろ',
        status: {
          currentHp: 10,
          statusCondition: StatusCondition.Burn,
          volatileState: { healBlockTurns: 2 },
          persistentState: { item: 'ラムのみ' },
        },
      });

      // Act
      await eatItem(get(1), context());

      // Assert
      expect(get(1).currentHp).toBe(10);
    });
  });

  describe('isPinchBerryHp（HP が 1/4 以下で食べるきのみ。くいしんぼうなら 1/2 以下）', () => {
    it.each([
      [25, true],
      [26, false],
    ])('特性がなければ、HP %i / 100 で %s', async (currentHp, expected) => {
      // Arrange
      const { get, context } = createInMemoryBattle({ status: { currentHp, maxHp: 100 } });

      // Act
      const result = await isPinchBerryHp(get(1), context());

      // Assert
      expect(result).toBe(expected);
    });

    it.each([
      [50, true],
      [51, false],
    ])('くいしんぼうなら、HP %i / 100 で %s', async (currentHp, expected) => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        ability: 'くいしんぼう',
        status: { currentHp, maxHp: 100 },
      });

      // Act
      const result = await isPinchBerryHp(get(1), context());

      // Assert
      expect(result).toBe(expected);
    });

    it('ひんしなら false', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({ status: { currentHp: 0, maxHp: 100 } });

      // Act
      const result = await isPinchBerryHp(get(1), context());

      // Assert
      expect(result).toBe(false);
    });
  });
});
