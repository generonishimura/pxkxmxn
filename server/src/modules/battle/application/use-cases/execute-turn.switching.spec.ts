import { SideConditions, getSideConditions } from '../../domain/state/side-state';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { requestSwitch } from '@/modules/pokemon/domain/battle-events/switching';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * 技・特性による交代（エンジン全体）
 * トレーナー 1: 場の 1、控えの 3。トレーナー 2: 場の 2、控えの 4。最大 HP は 160。
 * 1 は素早さが高く先に動く。たいあたり（威力 50）は 36 ダメージ
 */
describe('ExecuteTurnUseCase - 技・特性による交代', () => {
  const TACKLE = createTestMove(1, 'たいあたり');
  const U_TURN = createTestMove(2, 'テストのとんぼがえり', { type: 'むし' });
  const ROAR = createTestMove(3, 'テストのほえる', { category: MoveCategory.Status, priority: -6 });
  const DRAGON_TAIL = createTestMove(4, 'テストのドラゴンテール', { type: 'ドラゴン' });
  const BATON_PASS = createTestMove(5, 'テストのバトンタッチ', { category: MoveCategory.Status });
  const REVIVAL = createTestMove(6, 'テストのさいきのいのり', { category: MoveCategory.Status });
  const SPLASH = createTestMove(7, 'はねる', { category: MoveCategory.Status });
  const PARTING = createTestMove(8, 'テストのすてゼリフ', { category: MoveCategory.Status });
  const moves = [TACKLE, U_TURN, ROAR, DRAGON_TAIL, BATON_PASS, REVIVAL, SPLASH, PARTING];
  const allMoveIds = moves.map(m => m.id);

  const effects: Record<string, IMoveEffect> = {
    テストのとんぼがえり: { selfSwitch: true },
    テストのほえる: { forceSwitch: true },
    テストのドラゴンテール: { forceSwitch: true },
    テストのバトンタッチ: { selfSwitch: 'batonPass' },
    テストのさいきのいのり: {
      onUse: async (attacker, _defender, ctx) => {
        await requestSwitch(ctx, attacker.trainerId, 'revivalBlessing');
        return null;
      },
    },
    テストのすてゼリフ: {
      selfSwitch: true,
      onUse: async (_attacker, _defender, ctx) => {
        ctx.selfSwitchCancelled = true;
        return 'But it failed';
      },
    },
  };

  const setup = (
    options: {
      p1?: Partial<HarnessPokemon>;
      p2?: Partial<HarnessPokemon>;
      p3?: Partial<HarnessPokemon> | null;
      p4?: Partial<HarnessPokemon> | null;
      side1?: SideConditions;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      sideState: options.side1 ? { sides: { '1': options.side1 } } : {},
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds, ...options.p1 },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
        ...(options.p3 === null
          ? []
          : [{ id: 3, trainerId: 1, moveIds: allMoveIds, ...options.p3 }]),
        ...(options.p4 === null
          ? []
          : [{ id: 4, trainerId: 2, moveIds: allMoveIds, ...options.p4 }]),
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    for (const [name, effect] of Object.entries(effects)) {
      MoveRegistry.register(name, effect);
    }
  });

  describe('自分が交代する技（selfSwitch）', () => {
    it('とんぼがえりを当てると、控えの先頭と交代し、相手の技は出てきたポケモンが受ける', async () => {
      // Arrange
      const engine = setup({ p1: { volatileState: { leechSeed: true } } });

      // Act
      const result = await engine.runTurn({ moveId: U_TURN.id }, { moveId: TACKLE.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(engine.status(1).volatileState).toEqual({});
      expect(engine.status(3).currentHp).toBe(124);
      expect(result.actions.map(a => [a.trainerId, a.action])).toEqual([
        [1, 'move'],
        [1, 'switch'],
        [2, 'move'],
      ]);
      expect(getSideConditions(engine.battle().sideState, 1).pendingChoice).toBeUndefined();
    });

    it('控えがいなければ、とんぼがえりでも交代しない', async () => {
      // Arrange
      const engine = setup({ p3: null });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: TACKLE.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
    });

    it('とんぼがえりで出てきたポケモンも、設置技を受ける', async () => {
      // Arrange
      const engine = setup({ side1: { stealthRock: true } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(3).currentHp).toBe(140);
    });

    it('バトンタッチは、能力ランクと一時的な状態を引き継ぐ', async () => {
      // Arrange
      const engine = setup({ p1: { volatileState: { substituteHp: 40 } } });
      await engine.battleRepository.updateBattlePokemonStatus(1, { attackRank: 2 });

      // Act
      await engine.runTurn({ moveId: BATON_PASS.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(engine.status(3).attackRank).toBe(2);
      expect(engine.status(3).volatileState.substituteHp).toBe(40);
    });

    it('技の効果が selfSwitchCancelled を立てると交代しない', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: PARTING.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
    });
  });

  describe('相手を交代させる技（forceSwitch）', () => {
    it('ほえるは、相手を控えと入れ替える', async () => {
      // Arrange
      const engine = setup();

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: ROAR.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(result.actions[result.actions.length - 1]).toEqual({
        trainerId: 1,
        action: 'switch',
        result: 'Pokemon was dragged out! Pokemon switched to ID: 3',
      });
    });

    it('相手に控えがいなければ、ほえるは失敗する', async () => {
      // Arrange
      const engine = setup({ p3: null });

      // Act
      const result = await engine.runTurn({ moveId: SPLASH.id }, { moveId: ROAR.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(result.actions[result.actions.length - 1]?.result).toBe(
        'Used テストのほえる but it failed',
      );
    });

    it('ねをはっている相手には、ほえるは失敗する', async () => {
      // Arrange
      const engine = setup({ p1: { volatileState: { ingrain: true } } });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: ROAR.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
    });

    it('preventsForcedSwitch の特性（きゅうばん）の相手には、ほえるは失敗する', async () => {
      // Arrange
      AbilityRegistry.register('テストのきゅうばん', { preventsForcedSwitch: true });
      const engine = setup({ p1: { ability: 'テストのきゅうばん' } });

      // Act
      await engine.runTurn({ moveId: SPLASH.id }, { moveId: ROAR.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
    });

    it('先に動いたドラゴンテールで入れ替えられたポケモンは、そのターンに行動しない', async () => {
      // Arrange
      const engine = setup({ p1: { baseSpeed: 50 }, p2: { baseSpeed: 150 } });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: DRAGON_TAIL.id });

      // Assert
      expect(engine.active(1)?.id).toBe(3);
      expect(engine.status(1).currentHp).toBe(136);
      expect(result.actions.filter(a => a.trainerId === 1 && a.action === 'move')).toEqual([]);
      expect(engine.status(2).currentHp).toBe(160);
    });
  });

  describe('ききかいひ・にげごし（switchesOutBelowHalfHp）', () => {
    it('相手の技で HP が半分以下になると、控えと交代し、そのターンは行動しない', async () => {
      // Arrange
      AbilityRegistry.register('テストのききかいひ', { switchesOutBelowHalfHp: true });
      const engine = setup({ p2: { ability: 'テストのききかいひ', currentHp: 90 } });

      // Act
      const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: TACKLE.id });

      // Assert
      expect(engine.active(2)?.id).toBe(4);
      expect(engine.status(2).currentHp).toBe(54);
      expect(result.actions.filter(a => a.trainerId === 2).map(a => a.action)).toEqual(['switch']);
    });

    it('HP が半分より上に残れば交代しない', async () => {
      // Arrange
      AbilityRegistry.register('テストのききかいひ', { switchesOutBelowHalfHp: true });
      const engine = setup({ p2: { ability: 'テストのききかいひ' } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(2)?.id).toBe(2);
    });

    it('ききかいひが発動したときは、とんぼがえりの使用者は交代しない', async () => {
      // Arrange
      AbilityRegistry.register('テストのききかいひ', { switchesOutBelowHalfHp: true });
      const engine = setup({ p2: { ability: 'テストのききかいひ', currentHp: 90 } });

      // Act
      await engine.runTurn({ moveId: U_TURN.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.active(1)?.id).toBe(1);
      expect(engine.active(2)?.id).toBe(4);
    });
  });

  describe('さいきのいのり（revivalBlessing）', () => {
    it('ひんしの手持ちの先頭を、最大 HP の半分で復活させ、復活した回数を書く', async () => {
      // Arrange
      const engine = setup({ p3: { currentHp: 0 } });

      // Act
      const result = await engine.runTurn({ moveId: REVIVAL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(3).currentHp).toBe(80);
      expect(engine.status(3).isActive).toBe(false);
      expect(engine.status(3).persistentState.revivalCount).toBe(1);
      expect(engine.active(1)?.id).toBe(1);
      expect(result.actions).toContainEqual({
        trainerId: 1,
        action: 'revive',
        result: 'Pokemon (ID: 3) was revived and is ready to fight again!',
      });
    });
  });
});
