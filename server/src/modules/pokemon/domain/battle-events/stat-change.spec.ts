import { AbilityRegistry } from '../abilities/ability-registry';
import { MoldBreakerEffect } from '../abilities/effects/mold-breaker-effect';
import { EffectSource } from './effect-source';
import { StatChange, applyStatChanges } from './stat-change';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('applyStatChanges（能力ランクの変化）', () => {
  const growl: EffectSource = { kind: 'move', name: 'なきごえ' };
  const intimidate: EffectSource = { kind: 'ability', name: 'いかく' };
  const atk = (rankChange: number): StatChange => ({ statType: 'attack', rankChange });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('ランクの書き込み', () => {
    it('ランクを変え、実際に変わった量を返す（-6〜+6に収める）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { attackRank: 5, speedRank: 1 } });

      // Act
      const result = await applyStatChanges(
        get(1),
        [atk(2), { statType: 'speed', rankChange: -1 }],
        context(),
      );

      // Assert
      expect(result.applied).toEqual([atk(1), { statType: 'speed', rankChange: -1 }]);
      expect(get(1).attackRank).toBe(6);
      expect(get(1).speedRank).toBe(0);
    });

    it('どのランクも変わらなければ書き込まない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: { attackRank: 6 },
      });

      // Act
      const result = await applyStatChanges(get(1), [atk(1)], context());

      // Assert
      expect(result.applied).toEqual([]);
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });

  describe('modifyIncomingStatChange（たんじゅん・あまのじゃく・ばんけん）', () => {
    it('対象の特性が返した量でランクを変え、変化と原因を渡す', async () => {
      // Arrange
      const modifyIncomingStatChange = jest.fn(
        (_holder: unknown, change: StatChange, _source?: EffectSource) => change.rankChange * -2,
      );
      AbilityRegistry.register('テストあまのじゃく', { modifyIncomingStatChange });
      const { context, get } = createInMemoryBattle({ ability: 'テストあまのじゃく' });
      const source = { ...growl, pokemon: get(2) };

      // Act
      const result = await applyStatChanges(get(1), [atk(-1)], context(), { source });

      // Assert
      expect(result.applied).toEqual([atk(2)]);
      expect(modifyIncomingStatChange.mock.calls[0][1]).toEqual(atk(-1));
      expect(modifyIncomingStatChange.mock.calls[0][2]).toBe(source);
    });

    it('相手の技による変化は、使い手のかたやぶりで無視される', async () => {
      // Arrange
      AbilityRegistry.register('テストあまのじゃく', { modifyIncomingStatChange: () => 1 });
      AbilityRegistry.register('テストかたやぶり', new MoldBreakerEffect());
      const { context, get } = createInMemoryBattle(
        { ability: 'テストあまのじゃく' },
        { ability: 'テストかたやぶり' },
      );

      // Act
      const result = await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { ...growl, pokemon: get(2) },
      });

      // Assert
      expect(result.applied).toEqual([atk(-1)]);
    });

    it('自分で起こした変化（つるぎのまいなど）にも呼ばれる', async () => {
      // Arrange
      AbilityRegistry.register('テストたんじゅん', {
        modifyIncomingStatChange: (_holder, change) => change.rankChange * 2,
      });
      const { context, get } = createInMemoryBattle({ ability: 'テストたんじゅん' });

      // Act
      const result = await applyStatChanges(get(1), [atk(2)], context(), {
        source: { kind: 'move', name: 'つるぎのまい', pokemon: get(1) },
      });

      // Assert
      expect(result.applied).toEqual([atk(4)]);
    });
  });

  describe('canReceiveStatChange（クリアボディなど）', () => {
    it('相手が起こした低下だけを判定し、原因を渡す', async () => {
      // Arrange
      const canReceiveStatChange = jest.fn().mockReturnValue(false);
      AbilityRegistry.register('テストクリアボディ', { canReceiveStatChange });
      const { context, get } = createInMemoryBattle({ ability: 'テストクリアボディ' });
      const source = { ...intimidate, pokemon: get(2) };

      // Act
      const fromOpponent = await applyStatChanges(get(1), [atk(-1)], context(), { source });
      const bySelf = await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { kind: 'move', name: 'ばかぢから', pokemon: get(1) },
      });

      // Assert
      expect(fromOpponent.applied).toEqual([]);
      expect(canReceiveStatChange.mock.calls[0][4]).toBe(source);
      expect(bySelf.applied).toEqual([atk(-1)]);
      expect(canReceiveStatChange).toHaveBeenCalledTimes(1);
    });
  });

  describe('reflectsStatDrops（ミラーアーマー）', () => {
    it('相手が起こした低下を、自分は受けずに相手へ返す', async () => {
      // Arrange
      AbilityRegistry.register('テストミラーアーマー', { reflectsStatDrops: true });
      const { context, get } = createInMemoryBattle({ ability: 'テストミラーアーマー' });

      // Act
      const result = await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { ...intimidate, pokemon: get(2) },
      });

      // Assert
      expect(result.applied).toEqual([]);
      expect(result.reflected).toEqual([atk(-1)]);
      expect(get(1).attackRank).toBe(0);
      expect(get(2).attackRank).toBe(-1);
    });

    it('返された低下は、相手もミラーアーマーでも跳ね返さない', async () => {
      // Arrange
      AbilityRegistry.register('テストミラーアーマー', { reflectsStatDrops: true });
      const { context, get } = createInMemoryBattle(
        { ability: 'テストミラーアーマー' },
        { ability: 'テストミラーアーマー' },
      );

      // Act
      await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { ...intimidate, pokemon: get(2) },
      });

      // Assert
      expect(get(1).attackRank).toBe(0);
      expect(get(2).attackRank).toBe(-1);
    });

    it('すでに-6のランクは跳ね返さない', async () => {
      // Arrange
      AbilityRegistry.register('テストミラーアーマー', { reflectsStatDrops: true });
      const { context, get } = createInMemoryBattle({
        ability: 'テストミラーアーマー',
        status: { attackRank: -6 },
      });

      // Act
      await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { ...intimidate, pokemon: get(2) },
      });

      // Assert
      expect(get(2).attackRank).toBe(0);
    });
  });

  describe('変化のあとの特性', () => {
    it('対象の onStatChanged に、実際の変化と原因を渡す（まけんき・びびり）', async () => {
      // Arrange
      const onStatChanged = jest.fn().mockResolvedValue('Attack rose sharply!');
      AbilityRegistry.register('テストまけんき', { onStatChanged });
      const { context, get } = createInMemoryBattle({ ability: 'テストまけんき' });
      const source = { ...intimidate, pokemon: get(2) };

      // Act
      const result = await applyStatChanges(get(1), [atk(-1)], context(), { source });

      // Assert
      const [holder, applied, givenSource] = onStatChanged.mock.calls[0];
      expect(holder.attackRank).toBe(-1);
      expect(applied).toEqual([atk(-1)]);
      expect(givenSource).toBe(source);
      expect(result.messages).toEqual(['Attack rose sharply!']);
    });

    it('相手の onOpponentStatChanged に、変化したポケモンと変化を渡す（びんじょう）', async () => {
      // Arrange
      const onOpponentStatChanged = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストびんじょう', { onOpponentStatChanged });
      const { context, get } = createInMemoryBattle({}, { ability: 'テストびんじょう' });

      // Act: 技の実行中なら、コンテキストの attacker / defender から相手を探す
      await applyStatChanges(get(1), [atk(2)], context({ attacker: get(1), defender: get(2) }), {
        source: { kind: 'move', name: 'つるぎのまい', pokemon: get(1) },
      });

      // Assert
      const [holder, changed, applied] = onOpponentStatChanged.mock.calls[0];
      expect(holder.id).toBe(2);
      expect(changed.attackRank).toBe(2);
      expect(applied).toEqual([atk(2)]);
    });

    it('ランクが変わらなければ、変化のあとの特性を呼ばない', async () => {
      // Arrange
      const onStatChanged = jest.fn().mockResolvedValue(null);
      AbilityRegistry.register('テストまけんき', { onStatChanged });
      const { context, get } = createInMemoryBattle({
        ability: 'テストまけんき',
        status: { attackRank: -6 },
      });

      // Act
      await applyStatChanges(get(1), [atk(-1)], context(), {
        source: { ...intimidate, pokemon: get(2) },
      });

      // Assert
      expect(onStatChanged).not.toHaveBeenCalled();
    });
  });
});
