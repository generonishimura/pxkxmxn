import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 急所に関わる特性（きょううん・ひとでなし・いかりのつぼ）をエンジン全体で確かめる
 * どちらも能力 120・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は、ふつう 36、急所なら 54 のダメージ
 */
describe('ExecuteTurnUseCase - 急所に関わる特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const NIGHT_SLASH = createTestMove(3, 'つじぎり');
  const FROST_BREATH = createTestMove(4, 'こおりのいぶき');
  const moves = [SPLASH, TACKLE, NIGHT_SLASH, FROST_BREATH];

  const setup = (options: {
    random: () => number;
    attackerAbility?: string;
    defenderAbility?: string;
    defenderStatus?: StatusCondition;
  }) =>
    createBattleEngine({
      moves,
      criticalHitRandom: options.random,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: [1, 2, 3, 4],
          ability: options.attackerAbility,
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          moveIds: [1],
          ability: options.defenderAbility,
          statusCondition: options.defenderStatus,
        },
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

  describe('きょううん', () => {
    it('急所ランク 0 の技が 1/8 で急所になる（乱数 0.1 で急所）', async () => {
      // Arrange
      const engine = setup({ random: () => 0.1, attackerAbility: 'きょううん' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });

    it('急所に当たりやすい技と重なり、1/2 で急所になる（乱数 0.4 で急所）', async () => {
      // Arrange
      const engine = setup({ random: () => 0.4, attackerAbility: 'きょううん' });

      // Act
      await engine.runTurn({ moveId: NIGHT_SLASH.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });
  });

  describe('ひとでなし', () => {
    it('相手が もうどく なら、乱数にかかわらず急所になる', async () => {
      // Arrange
      const engine = setup({
        random: () => 0.99,
        attackerAbility: 'ひとでなし',
        defenderStatus: StatusCondition.BadPoison,
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      // 急所のダメージ 54 と、ターン終了時のもうどくのダメージ 10（最大 HP の 1/16）
      expect(damageTaken(engine)).toBe(54 + 10);
    });

    it('相手が状態異常でなければ、急所にならない', async () => {
      // Arrange
      const engine = setup({ random: () => 0.99, attackerAbility: 'ひとでなし' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });
  });

  describe('いかりのつぼ', () => {
    it('急所に当たると、攻撃ランクが+6になる', async () => {
      // Arrange
      const engine = setup({ random: () => 0.99, defenderAbility: 'いかりのつぼ' });

      // Act
      await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).attackRank).toBe(6);
    });

    it('急所でない攻撃では、攻撃ランクは変わらない', async () => {
      // Arrange
      const engine = setup({ random: () => 0.99, defenderAbility: 'いかりのつぼ' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).attackRank).toBe(0);
    });
  });
});
