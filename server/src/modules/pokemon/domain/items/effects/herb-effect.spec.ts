import { AbilityRegistry } from '../../abilities/ability-registry';
import { applyStatChanges } from '../../battle-events/stat-change';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ItemRegistry } from '../item-registry';

describe('ハーブ', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  describe('メンタルハーブ', () => {
    it.each([
      ['ちょうはつ', { tauntTurns: 3 }],
      ['アンコール', { encore: { moveId: 5, turns: 3 } }],
      ['かなしばり', { disable: { moveId: 5, turns: 4 } }],
      ['いちゃもん', { torment: true }],
      ['かいふくふうじ', { healBlockTurns: 5 }],
      ['メロメロ', { infatuatedWithStatusId: 2 }],
    ])('%s の状態なら、使い切って治す', async (_name, volatileState) => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { volatileState, persistentState: { item: 'メンタルハーブ' } },
      });

      // Act
      const message = await ItemRegistry.get('メンタルハーブ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).volatileState).toEqual({});
      expect(get(1).persistentState.consumedItem).toBe('メンタルハーブ');
      expect(message).toContain('メンタルハーブ');
    });

    it('いくつかの状態があれば、1 回ですべて治す', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: {
          volatileState: { tauntTurns: 3, torment: true, confusionTurns: 2 },
          persistentState: { item: 'メンタルハーブ' },
        },
      });

      // Act
      await ItemRegistry.get('メンタルハーブ')?.onUpdate?.(get(1), context());

      // Assert: こんらんは治さない
      expect(get(1).volatileState).toEqual({ confusionTurns: 2 });
    });

    it('治す状態がなければ使わない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: {
          volatileState: { confusionTurns: 2 },
          persistentState: { item: 'メンタルハーブ' },
        },
      });

      // Act
      const message = await ItemRegistry.get('メンタルハーブ')?.onUpdate?.(get(1), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState.item).toBe('メンタルハーブ');
    });
  });

  describe('しろいハーブ', () => {
    it('能力ランクが下がったら、使い切って下がったランクだけを 0 に戻す', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle(
        {},
        { status: { speedRank: 2, persistentState: { item: 'しろいハーブ' } } },
      );

      // Act
      const result = await applyStatChanges(
        get(2),
        [
          { statType: 'defense', rankChange: -1 },
          { statType: 'specialDefense', rankChange: -1 },
        ],
        context(),
      );

      // Assert
      expect(get(2).defenseRank).toBe(0);
      expect(get(2).specialDefenseRank).toBe(0);
      expect(get(2).speedRank).toBe(2);
      expect(get(2).persistentState.consumedItem).toBe('しろいハーブ');
      expect(result.messages.some(message => message.includes('しろいハーブ'))).toBe(true);
    });

    it('能力ランクが上がっただけなら使わない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { persistentState: { item: 'しろいハーブ' } },
      });

      // Act
      await applyStatChanges(get(1), [{ statType: 'attack', rankChange: 2 }], context());

      // Assert
      expect(get(1).attackRank).toBe(2);
      expect(get(1).persistentState.item).toBe('しろいハーブ');
    });

    it('すでに下がったランクがあれば、onUpdate でも戻す', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { accuracyRank: -1, evasionRank: -2, persistentState: { item: 'しろいハーブ' } },
      });

      // Act
      await ItemRegistry.get('しろいハーブ')?.onUpdate?.(get(1), context());

      // Assert
      expect(get(1).accuracyRank).toBe(0);
      expect(get(1).evasionRank).toBe(0);
      expect(get(1).persistentState.item).toBeUndefined();
    });

    it('下がったランクがなければ、onUpdate で何もしない', async () => {
      // Arrange
      const { get, context } = createInMemoryBattle({
        status: { attackRank: 1, persistentState: { item: 'しろいハーブ' } },
      });

      // Act
      const message = await ItemRegistry.get('しろいハーブ')?.onUpdate?.(get(1), context());

      // Assert
      expect(message).toBeNull();
      expect(get(1).persistentState.item).toBe('しろいハーブ');
    });
  });
});
