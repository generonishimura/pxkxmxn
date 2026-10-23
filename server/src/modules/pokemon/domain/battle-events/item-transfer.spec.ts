import { giveItem, swapItems, takeItem } from './item-transfer';
import { createInMemoryBattle, InMemoryPokemon } from './__tests__/in-memory-battle';
import { AbilityRegistry } from '../abilities/ability-registry';
import { ItemRegistry } from '../items/item-registry';

/**
 * 持ち物を奪う・渡す・入れ替える補助関数
 * フシギバナ（全国図鑑 3）のメガストーンはフシギバナイト
 */
describe('item-transfer', () => {
  const VENUSAUR = 3;
  const holding = (item: string, data: InMemoryPokemon = {}): InMemoryPokemon => ({
    ...data,
    status: { ...data.status, persistentState: { item } },
  });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('takeItem', () => {
    it('持ち物を外して名前を返す。使い切った持ち物（consumedItem）には残さない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(holding('たべのこし'));

      // Act
      const taken = await takeItem(get(1), context());

      // Assert
      expect(taken).toBe('たべのこし');
      expect(get(1).persistentState.item).toBeUndefined();
      expect(get(1).persistentState.consumedItem).toBeUndefined();
    });

    it('持ち物がなければ undefined を返す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const taken = await takeItem(get(1), context());

      // Assert
      expect(taken).toBeUndefined();
    });

    it('その種族のメガストーンは外せない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('フシギバナイト', { nationalDex: VENUSAUR }),
      );

      // Act
      const taken = await takeItem(get(1), context());

      // Assert
      expect(taken).toBeUndefined();
      expect(get(1).persistentState.item).toBe('フシギバナイト');
    });

    it('別の種族のメガストーンは外せる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(holding('フシギバナイト'));

      // Act
      const taken = await takeItem(get(1), context());

      // Assert
      expect(taken).toBe('フシギバナイト');
    });

    it('ねんちゃくの持ち主からは、ほかのポケモンが奪えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('たべのこし', { ability: 'ねんちゃく' }),
      );

      // Act
      const taken = await takeItem(get(1), context(), { source: get(2) });

      // Assert
      expect(taken).toBeUndefined();
      expect(get(1).persistentState.item).toBe('たべのこし');
    });

    it('ねんちゃくでも、自分で手放すことはできる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('たべのこし', { ability: 'ねんちゃく' }),
      );

      // Act
      const taken = await takeItem(get(1), context(), { source: get(1) });

      // Assert
      expect(taken).toBe('たべのこし');
    });

    it('奪う側がかたやぶりなら、ねんちゃくを無視する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('たべのこし', { ability: 'ねんちゃく' }),
        { ability: 'かたやぶり' },
      );

      // Act
      const taken = await takeItem(get(1), context(), { source: get(2) });

      // Assert
      expect(taken).toBe('たべのこし');
    });

    it('こだわりの持ち物を外すと、技の固定が解ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('こだわりスカーフ', { status: { volatileState: { choiceLockedMoveId: 5 } } }),
      );

      // Act
      await takeItem(get(1), context());

      // Assert
      expect(get(1).volatileState.choiceLockedMoveId).toBeUndefined();
    });

    it('ごりむちゅうの固定は、持ち物を外しても解けない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('こだわりスカーフ', {
          ability: 'ごりむちゅう',
          status: { volatileState: { choiceLockedMoveId: 5 } },
        }),
      );

      // Act
      await takeItem(get(1), context());

      // Assert
      expect(get(1).volatileState.choiceLockedMoveId).toBe(5);
    });
  });

  describe('giveItem', () => {
    it('持ち物のないポケモンに持たせる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const given = await giveItem(get(1), 'たべのこし', context());

      // Assert
      expect(given).toBe(true);
      expect(get(1).persistentState.item).toBe('たべのこし');
    });

    it('すでに持ち物があれば持たせない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(holding('オボンのみ'));

      // Act
      const given = await giveItem(get(1), 'たべのこし', context());

      // Assert
      expect(given).toBe(false);
      expect(get(1).persistentState.item).toBe('オボンのみ');
    });

    it('その種族のメガストーンは渡せない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ nationalDex: VENUSAUR });

      // Act
      const given = await giveItem(get(1), 'フシギバナイト', context());

      // Assert
      expect(given).toBe(false);
      expect(get(1).persistentState.item).toBeUndefined();
    });

    it('ひんしのポケモンには持たせない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { currentHp: 0 } });

      // Act
      const given = await giveItem(get(1), 'たべのこし', context());

      // Assert
      expect(given).toBe(false);
    });

    it('受け取ったポケモンのこだわりの固定は解ける（次に出した技に固定し直す）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({
        status: { volatileState: { choiceLockedMoveId: 5 } },
      });

      // Act
      await giveItem(get(1), 'こだわりスカーフ', context());

      // Assert
      expect(get(1).volatileState.choiceLockedMoveId).toBeUndefined();
    });
  });

  describe('swapItems', () => {
    it('2 体の持ち物を入れ替える', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('こだわりスカーフ'),
        holding('たべのこし'),
      );

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toEqual({ sourceItem: 'こだわりスカーフ', targetItem: 'たべのこし' });
      expect(get(1).persistentState.item).toBe('たべのこし');
      expect(get(2).persistentState.item).toBe('こだわりスカーフ');
    });

    it('片方だけが持っていれば、もう片方に移す', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(holding('たべのこし'));

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toEqual({ sourceItem: 'たべのこし', targetItem: undefined });
      expect(get(1).persistentState.item).toBeUndefined();
      expect(get(2).persistentState.item).toBe('たべのこし');
    });

    it('どちらも持っていなければ失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toBeUndefined();
    });

    it('相手がその種族のメガストーンを持っていれば、何も書かずに失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('たべのこし'),
        holding('フシギバナイト', { nationalDex: VENUSAUR }),
      );

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toBeUndefined();
      expect(get(1).persistentState.item).toBe('たべのこし');
      expect(get(2).persistentState.item).toBe('フシギバナイト');
    });

    it('相手の種族のメガストーンは、相手に渡せない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(holding('フシギバナイト'), {
        nationalDex: VENUSAUR,
      });

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toBeUndefined();
      expect(get(1).persistentState.item).toBe('フシギバナイト');
    });

    it('相手がねんちゃくなら失敗する', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('こだわりスカーフ'),
        holding('たべのこし', { ability: 'ねんちゃく' }),
      );

      // Act
      const swapped = await swapItems(get(1), get(2), context());

      // Assert
      expect(swapped).toBeUndefined();
      expect(get(2).persistentState.item).toBe('たべのこし');
    });

    it('入れ替えると、両方のこだわりの固定が解ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        holding('こだわりスカーフ', { status: { volatileState: { choiceLockedMoveId: 5 } } }),
        holding('たべのこし', { status: { volatileState: { choiceLockedMoveId: 6 } } }),
      );

      // Act
      await swapItems(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.choiceLockedMoveId).toBeUndefined();
      expect(get(2).volatileState.choiceLockedMoveId).toBeUndefined();
    });
  });
});
