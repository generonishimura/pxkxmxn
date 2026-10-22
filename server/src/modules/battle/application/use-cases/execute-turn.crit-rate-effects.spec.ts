import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleArmorEffect } from '@/modules/pokemon/domain/abilities/effects/other/battle-armor-effect';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { FocusEnergyEffect } from '@/modules/pokemon/domain/moves/effects/focus-energy-effect';
import { LaserFocusEffect } from '@/modules/pokemon/domain/moves/effects/laser-focus-effect';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * きあいだめ・とぎすます・カブトアーマー・シェルアーマー（登録とエンジン全体の動き）
 * どちらも能力 120・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は、ふつう 36、急所なら 54 のダメージ
 */
describe('ExecuteTurnUseCase - 急所ランクを変える技・急所を防ぐ特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const FROST_BREATH = createTestMove(3, 'こおりのいぶき');
  const FOCUS_ENERGY = createTestMove(4, 'きあいだめ', { category: MoveCategory.Status });
  const LASER_FOCUS = createTestMove(5, 'とぎすます', { category: MoveCategory.Status });
  const moves = [SPLASH, TACKLE, FROST_BREATH, FOCUS_ENERGY, LASER_FOCUS];

  const setup = (options: { random?: () => number; defenderAbility?: string } = {}) =>
    createBattleEngine({
      moves,
      criticalHitRandom: options.random,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: [1, 2, 3, 4, 5] },
        { id: 2, trainerId: 2, active: true, moveIds: [1], ability: options.defenderAbility },
      ],
    });

  const damageTaken = (engine: ReturnType<typeof setup>): number =>
    160 - engine.status(2).currentHp;

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  describe('登録', () => {
    it('きあいだめ・とぎすますが技のレジストリに登録されている', () => {
      // Arrange
      // Act
      const focusEnergy = MoveRegistry.get('きあいだめ');
      const laserFocus = MoveRegistry.get('とぎすます');

      // Assert
      expect(focusEnergy).toBeInstanceOf(FocusEnergyEffect);
      expect(laserFocus).toBeInstanceOf(LaserFocusEffect);
    });

    it('カブトアーマー・シェルアーマーが特性のレジストリに登録されている', () => {
      // Arrange
      // Act
      const battleArmor = AbilityRegistry.get('カブトアーマー');
      const shellArmor = AbilityRegistry.get('シェルアーマー');

      // Assert
      expect(battleArmor).toBeInstanceOf(BattleArmorEffect);
      expect(shellArmor).toBeInstanceOf(BattleArmorEffect);
    });
  });

  describe('きあいだめ', () => {
    it('使ったあとは急所ランク 2 になり、乱数が 1/2 より小さければ急所になる', async () => {
      // Arrange
      const engine = setup({ random: () => 0.4 });

      // Act
      const result = await engine.runTurn({ moveId: FOCUS_ENERGY.id }, { moveId: SPLASH.id });
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toContain('is getting pumped!');
      expect(engine.status(1).volatileState.critStageBoost).toBe(2);
      expect(damageTaken(engine)).toBe(54);
    });

    it('すでにきあいだめしていたら失敗する', async () => {
      // Arrange
      const engine = setup();

      // Act
      await engine.runTurn({ moveId: FOCUS_ENERGY.id }, { moveId: SPLASH.id });
      const result = await engine.runTurn({ moveId: FOCUS_ENERGY.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toContain('But it failed');
      expect(engine.status(1).volatileState.critStageBoost).toBe(2);
    });
  });

  describe('とぎすます', () => {
    it('次のターンの攻撃は必ず急所になり、その次のターンの攻撃は急所にならない', async () => {
      // Arrange
      const engine = setup({ random: () => 1 });

      // Act
      const result = await engine.runTurn({ moveId: LASER_FOCUS.id }, { moveId: SPLASH.id });
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
      const afterNextTurn = damageTaken(engine);
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(result.actions[0].result).toContain('concentrated intensely!');
      expect(afterNextTurn).toBe(54);
      expect(damageTaken(engine)).toBe(54 + 36);
    });
  });

  describe.each(['カブトアーマー', 'シェルアーマー'])('%s', abilityName => {
    it('必ず急所になる技でも急所にならない', async () => {
      // Arrange
      const engine = setup({ defenderAbility: abilityName });

      // Act
      const result = await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
      expect(result.actions[0].result).not.toContain('A critical hit!');
    });
  });
});
