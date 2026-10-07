import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { changeForm } from '@/modules/pokemon/domain/battle-events/form-change';
import { transformInto } from '@/modules/pokemon/domain/battle-events/transform';
import { resolveBattleAbilityName } from '@/modules/pokemon/domain/battle-events/battle-traits';
import { resolveCurrentAbilityName } from '@/modules/pokemon/domain/battle-events/ability-change';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { resolveMoveSlots } from '../../domain/logic/move-selection';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * フォルムチェンジ（changeForm）とへんしん（transformInto）を、技・特性の効果から呼んだとき（エンジン全体）
 */
describe('ExecuteTurnUseCase - フォルムチェンジとへんしん', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const TRANSFORM = createTestMove(3, 'へんしん', { category: MoveCategory.Status });
  const EMBER = createTestMove(4, 'ひのこ', { type: 'ほのお' });
  const SUBSTITUTE = createTestMove(5, 'みがわり', { category: MoveCategory.Status });
  const MOVES = [SPLASH, TACKLE, TRANSFORM, EMBER, SUBSTITUTE];

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    // ひのこの追加効果（10% のやけど）で、ターン終了時の HP が揺れないようにする
    MoveRegistry.register('ひのこ', {});
  });

  describe('changeForm', () => {
    it('ターン終了時の特性で、交代で戻るフォルムに変わる（ダルマモード）', async () => {
      // Arrange
      AbilityRegistry.register('テストのダルマモード', {
        onTurnEnd: async (holder, ctx) => {
          if (ctx && holder.currentHp <= holder.maxHp / 2) {
            await changeForm(holder, 'zen', ctx);
          }
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [1],
            nationalDex: 555,
            types: ['ほのお'],
            ability: 'テストのダルマモード',
            currentHp: 80,
            volatileState: { typeOverride: ['みず'], statOverrides: { attack: 1 } },
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert: フォルムを書き、タイプ・実数値の上書きを消す（本家の setSpecies）
      expect(engine.status(1).volatileState.form).toBe('zen');
      expect(engine.status(1).volatileState.typeOverride).toBeUndefined();
      expect(engine.status(1).volatileState.statOverrides).toBeUndefined();
    });

    it('交代しても残るフォルムで最大 HP が変わると、減った HP を保ったまま最大 HP を変える（スワームチェンジ）', async () => {
      // Arrange
      AbilityRegistry.register('テストのスワームチェンジ', {
        onTurnEnd: async (holder, ctx) => {
          if (ctx) {
            await changeForm(holder, 'complete', ctx, { persistent: true });
          }
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [1],
            nationalDex: 718,
            types: ['ドラゴン', 'じめん'],
            baseStats: [108, 100, 121, 81, 95, 95],
            ability: 'テストのスワームチェンジ',
            currentHp: 80,
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert: パーフェクトフォルムの最大 HP は 291。減った 80 を保つので 211
      expect(engine.status(1).persistentState.form).toBe('complete');
      expect(engine.status(1).maxHp).toBe(291);
      expect(engine.status(1).currentHp).toBe(211);
    });

    it('特性を持つフォルムになると、その特性になる（テラスチェンジでテラスタルフォルムになり、テラスシェル）', async () => {
      // Arrange
      AbilityRegistry.register('テラスチェンジ', {
        onEntry: async (holder, ctx) => {
          if (ctx) {
            await changeForm(holder, 'terastal', ctx, { persistent: true });
          }
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1] },
          {
            id: 3,
            trainerId: 1,
            moveIds: [1],
            nationalDex: 1024,
            baseStats: [90, 65, 85, 65, 85, 60],
            ability: 'テラスチェンジ',
            maxHp: 165,
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert: HP の種族値が 90 → 95 になり、最大 HP は 165 → 170
      const terapagos = engine.status(3);
      const ctx: BattleContext = {
        battle: engine.battle(),
        battleRepository: engine.battleRepository,
        trainedPokemonRepository: engine.trainedPokemonRepository,
      };
      expect(terapagos.persistentState.form).toBe('terastal');
      expect(terapagos.maxHp).toBe(170);
      expect(await resolveBattleAbilityName(terapagos, ctx)).toBe('テラスシェル');
      expect(await resolveCurrentAbilityName(terapagos, ctx)).toBe('テラスシェル');
    });

    it('へんしん中はフォルムを変えない', async () => {
      // Arrange
      let changed: boolean | undefined;
      AbilityRegistry.register('テストのダルマモード', {
        onTurnEnd: async (holder, ctx) => {
          if (ctx) {
            changed = await changeForm(holder, 'zen', ctx);
          }
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [1],
            nationalDex: 555,
            ability: 'テストのダルマモード',
            volatileState: { transformedIntoStatusId: 2, abilityOverride: 'テストのダルマモード' },
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1] },
        ],
      });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(changed).toBe(false);
      expect(engine.status(1).volatileState.form).toBeUndefined();
    });
  });

  describe('transformInto', () => {
    const setup = (options: { substitute?: boolean } = {}) => {
      MoveRegistry.register('へんしん', {
        onUse: async (attacker, defender, ctx) =>
          (await transformInto(attacker, defender, ctx)) ? 'transformed!' : 'But it failed',
      });
      return createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [3], baseSpeed: 200 },
          {
            id: 2,
            trainerId: 2,
            active: true,
            moveIds: [2, 4],
            types: ['ほのお', 'ひこう'],
            ability: 'テストのもうか',
            baseStats: [100, 150, 100, 100, 100, 100],
            volatileState: {
              addedType: 'くさ',
              critStageBoost: 2,
              ...(options.substitute ? { substituteHp: 40 } : {}),
            },
          },
        ],
      });
    };

    it('相手のタイプ・実数値（HP を除く）・特性・能力ランク・技（PP 5）を写す', async () => {
      // Arrange
      const engine = setup();
      await engine.battleRepository.updateBattlePokemonStatus(2, { attackRank: 2 });

      // Act
      const result = await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toBe('Used へんしん transformed!');
      const state = engine.status(1).volatileState;
      expect(state.transformedIntoStatusId).toBe(2);
      expect(state.typeOverride).toEqual(['ほのお', 'ひこう']);
      expect(state.addedType).toBe('くさ');
      expect(state.abilityOverride).toBe('テストのもうか');
      expect(state.statOverrides).toEqual({
        attack: 170,
        defense: 120,
        specialAttack: 120,
        specialDefense: 120,
        speed: 120,
      });
      expect(state.critStageBoost).toBe(2);
      expect(state.moveSlotOverrides).toEqual([
        { battlePokemonMoveId: 20, moveId: 2, currentPp: 5, maxPp: 5 },
        { battlePokemonMoveId: 21, moveId: 4, currentPp: 5, maxPp: 5 },
      ]);
      expect(engine.status(1).attackRank).toBe(2);
      expect(engine.status(1).maxHp).toBe(160);
    });

    it('へんしんしたあとは、写した技を選んで出せて、PP は写した欄から減る', async () => {
      // Arrange
      const engine = setup();
      await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Act
      const result = await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toMatch(/^Used ひのこ and dealt/);
      expect(engine.status(1).volatileState.moveSlotOverrides?.[1].currentPp).toBe(4);
    });

    it('へんしん中に同じ欄を入れ替えた（ものまねで写した技）ときは、あとの技を出せて、その欄の PP が減る', async () => {
      // Arrange: 欄 20 はへんしんで写したはねるを、ものまねでたいあたりに入れ替えた
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: [3],
            volatileState: {
              transformedIntoStatusId: 2,
              moveSlotOverrides: [
                { battlePokemonMoveId: 20, moveId: SPLASH.id, currentPp: 5, maxPp: 5 },
                { battlePokemonMoveId: 20, moveId: TACKLE.id, currentPp: 5, maxPp: 5 },
              ],
            },
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1], baseSpeed: 50 },
        ],
      });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert: 欄 20 は 1 つだけ見え、たいあたりの PP が 4 になる
      expect(result.actions[0].result).toMatch(/^Used たいあたり and dealt/);
      const slots = resolveMoveSlots(
        await engine.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(1),
        engine.status(1).volatileState,
      );
      expect(slots).toEqual([
        { battlePokemonMoveId: 20, moveId: TACKLE.id, currentPp: 4, maxPp: 5, isOverride: true },
      ]);
    });

    it('へんげんじざい・リベロを使った記録を消す（本家は特性を写すと特性ごとの状態を作り直す）', async () => {
      // Arrange
      const engine = setup();
      await engine.battleRepository.patchVolatileState(1, { typeChangeAbilityUsed: true });

      // Act
      await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.transformedIntoStatusId).toBe(2);
      expect(engine.status(1).volatileState.typeChangeAbilityUsed).toBeUndefined();
    });

    it('みがわりの相手には、へんしんできない', async () => {
      // Arrange
      const engine = setup({ substitute: true });

      // Act
      const result = await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toMatch(/failed/i);
      expect(engine.status(1).volatileState.transformedIntoStatusId).toBeUndefined();
    });

    it('今と同じ特性を写したときは、onEntry を呼ばない（いかくが出直さない。本家の setAbility の isTransform）', async () => {
      // Arrange
      const onEntry = jest.fn();
      AbilityRegistry.register('テストのいかく', { onEntry });
      MoveRegistry.register('へんしん', {
        onUse: async (attacker, defender, ctx) =>
          (await transformInto(attacker, defender, ctx)) ? 'transformed!' : 'But it failed',
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [3], ability: 'テストのいかく' },
          {
            id: 2,
            trainerId: 2,
            active: true,
            moveIds: [1],
            ability: 'テストのいかく',
            baseSpeed: 50,
          },
        ],
      });

      // Act
      await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.transformedIntoStatusId).toBe(2);
      expect(onEntry).not.toHaveBeenCalled();
    });

    it('ちがう特性を写したときは、写した特性の onEntry を呼ぶ', async () => {
      // Arrange
      const onEntry = jest.fn();
      AbilityRegistry.register('テストのいかく', { onEntry });
      MoveRegistry.register('へんしん', {
        onUse: async (attacker, defender, ctx) =>
          (await transformInto(attacker, defender, ctx)) ? 'transformed!' : 'But it failed',
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [3], ability: 'ふみん' },
          {
            id: 2,
            trainerId: 2,
            active: true,
            moveIds: [1],
            ability: 'テストのいかく',
            baseSpeed: 50,
          },
        ],
      });

      // Act
      await engine.runTurn({ moveId: TRANSFORM.id }, { moveId: SPLASH.id });

      // Assert
      expect(onEntry).toHaveBeenCalledTimes(1);
    });

    it('交代で場に出たときの特性（かわりもの）から、相手にへんしんできる', async () => {
      // Arrange
      AbilityRegistry.register('テストのかわりもの', {
        onEntry: async (pokemon, ctx) => {
          const latest = await ctx?.battleRepository?.findBattlePokemonStatusById(pokemon.id);
          const opponent = await ctx?.battleRepository?.findActivePokemonByBattleIdAndTrainerId(
            pokemon.battleId,
            2,
          );
          if (ctx && latest && opponent) {
            await transformInto(latest, opponent, ctx);
          }
        },
      });
      const engine = createBattleEngine({
        moves: MOVES,
        pokemon: [
          { id: 1, trainerId: 1, active: true, moveIds: [1] },
          { id: 3, trainerId: 1, moveIds: [1], ability: 'テストのかわりもの' },
          { id: 2, trainerId: 2, active: true, moveIds: [2], types: ['でんき'] },
        ],
      });

      // Act
      await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(3).volatileState.transformedIntoStatusId).toBe(2);
      expect(engine.status(3).volatileState.typeOverride).toEqual(['でんき']);
    });
  });
});
