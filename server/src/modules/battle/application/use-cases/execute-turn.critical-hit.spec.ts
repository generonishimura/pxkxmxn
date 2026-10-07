import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { HitResult } from '@/modules/pokemon/domain/battle-events/hit-result';
import { VolatileState } from '../../domain/state/volatile-state';
import { SideState } from '../../domain/state/side-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 急所の判定（エンジン全体）
 * どちらも能力 120・ノーマルタイプ。威力 50 のノーマル技（タイプ一致）は、ふつう 36、急所なら 54 のダメージ
 */
describe('ExecuteTurnUseCase - 急所', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const NIGHT_SLASH = createTestMove(3, 'つじぎり');
  const FROST_BREATH = createTestMove(4, 'こおりのいぶき');
  const DOUBLE_HIT = createTestMove(5, 'ダブルアタック');
  const moves = [SPLASH, TACKLE, NIGHT_SLASH, FROST_BREATH, DOUBLE_HIT];

  const setup = (
    options: {
      random?: () => number;
      attackerAbility?: string;
      defenderAbility?: string;
      attackerVolatile?: VolatileState;
      defenderStatus?: StatusCondition;
      sideState?: SideState;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      criticalHitRandom: options.random,
      sideState: options.sideState,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          moveIds: [1, 2, 3, 4, 5],
          ability: options.attackerAbility,
          volatileState: options.attackerVolatile,
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

  it('急所ランク 0 の技は、乱数が 1/24 より小さければ急所になり、1.5 倍のダメージを与える', async () => {
    // Arrange
    const engine = setup({ random: () => 0.04 });

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54);
    expect(result.actions[0].result).toContain('A critical hit!');
  });

  it('急所ランク 0 の技は、乱数が 1/24 以上なら急所にならない', async () => {
    // Arrange
    const engine = setup({ random: () => 0.05 });

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(36);
    expect(result.actions[0].result).not.toContain('A critical hit!');
  });

  it('急所に当たりやすい技は急所ランク 1（乱数が 1/8 より小さければ急所）', async () => {
    // Arrange
    const engine = setup({ random: () => 0.12 });

    // Act
    await engine.runTurn({ moveId: NIGHT_SLASH.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54);
  });

  it('必ず急所になる技は、乱数にかかわらず急所になる', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54);
  });

  it('きあいだめ（critStageBoost: 2）でランク 2 になり、乱数が 1/2 より小さければ急所になる', async () => {
    // Arrange
    const engine = setup({ random: () => 0.4, attackerVolatile: { critStageBoost: 2 } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54);
  });

  it('とぎすます（laserFocusTurns）の間は必ず急所になる', async () => {
    // Arrange
    const engine = setup({ attackerVolatile: { laserFocusTurns: 2 } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54);
  });

  it('連続技は、ヒットごとに急所を判定する', async () => {
    // Arrange
    const rolls = [0.01, 0.99];
    const engine = setup({ random: () => rolls.shift() ?? 0.99 });

    // Act
    await engine.runTurn({ moveId: DOUBLE_HIT.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(54 + 36);
  });

  describe('特性のフック', () => {
    it('攻撃側特性の modifyCritRatio で急所ランクを上げられる（きょううん）', async () => {
      // Arrange
      AbilityRegistry.register('テストのきょううん', {
        modifyCritRatio: (_holder: BattlePokemonStatus, stage: number) => stage + 1,
      });
      const engine = setup({ random: () => 0.1, attackerAbility: 'テストのきょううん' });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });

    it('modifyCritRatio には相手の状態がコンテキストで渡る（ひとでなし）', async () => {
      // Arrange
      const merciless: IAbilityEffect = {
        modifyCritRatio: (_holder: BattlePokemonStatus, stage: number, ctx?: BattleContext) =>
          ctx?.defender?.statusCondition === StatusCondition.Poison ? 3 : stage,
      };
      AbilityRegistry.register('テストのひとでなし', merciless);
      const engine = setup({
        attackerAbility: 'テストのひとでなし',
        defenderStatus: StatusCondition.Poison,
      });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      // 急所のダメージ 54 と、ターン終了時のどくのダメージ 20（最大 HP の 1/8）
      expect(damageTaken(engine)).toBe(54 + 20);
    });

    it('防御側特性の preventsCriticalHit があれば急所にならない（カブトアーマー）', async () => {
      // Arrange
      AbilityRegistry.register('テストのカブトアーマー', { preventsCriticalHit: true });
      const engine = setup({ defenderAbility: 'テストのカブトアーマー' });

      // Act
      await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(36);
    });

    it('preventsCriticalHit は、かたやぶりで無視される', async () => {
      // Arrange
      AbilityRegistry.register('テストのカブトアーマー', { preventsCriticalHit: true });
      const engine = setup({
        attackerAbility: 'かたやぶり',
        defenderAbility: 'テストのカブトアーマー',
      });

      // Act
      await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

      // Assert
      expect(damageTaken(engine)).toBe(54);
    });

    it('防御側の onDamagingHit に、急所だったかが hit.isCriticalHit で渡る（いかりのつぼ）', async () => {
      // Arrange
      const hits: HitResult[] = [];
      AbilityRegistry.register('テストのいかりのつぼ', {
        onDamagingHit: (_h: BattlePokemonStatus, _a: BattlePokemonStatus, hit: HitResult) => {
          hits.push(hit);
          return Promise.resolve(null);
        },
      });
      const engine = setup({ defenderAbility: 'テストのいかりのつぼ' });

      // Act
      await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

      // Assert
      expect(hits).toHaveLength(1);
      expect(hits[0].isCriticalHit).toBe(true);
    });
  });

  it('相手の陣営のおまじない（luckyChantTurns）の間は急所にならない', async () => {
    // Arrange
    const engine = setup({ sideState: { sides: { '2': { luckyChantTurns: 3 } } } });

    // Act
    await engine.runTurn({ moveId: FROST_BREATH.id }, { moveId: SPLASH.id });

    // Assert
    expect(damageTaken(engine)).toBe(36);
  });
});
