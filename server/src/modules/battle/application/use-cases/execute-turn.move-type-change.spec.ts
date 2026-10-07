import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { SideState } from '../../domain/state/side-state';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 技のタイプを変える場の状態・一時的な状態（プラズマシャワー・そうでん）と、最後に使った技のタイプの記録（エンジン全体）
 * 相手はじめんタイプ（でんき技が効かない）。威力 50 の技は、タイプ一致なしで 24 ダメージ
 */
describe('ExecuteTurnUseCase - 技のタイプの変更', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const TACKLE = createTestMove(2, 'たいあたり');
  const EMBER = createTestMove(3, 'ひのこ', { type: 'ほのお' });
  const MOVES = [SPLASH, TACKLE, EMBER];

  const setup = (
    options: { sideState?: SideState; volatileState?: VolatileState; ability?: string } = {},
  ) =>
    createBattleEngine({
      moves: MOVES,
      sideState: options.sideState,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: [1, 2, 3],
          types: ['みず'],
          ability: options.ability,
          volatileState: options.volatileState,
        },
        { id: 2, trainerId: 2, active: true, moveIds: [1], types: ['じめん'], baseSpeed: 50 },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    // ひのこの追加効果（10% のやけど）で、ターン終了時の HP が揺れないようにする
    MoveRegistry.register('ひのこ', {});
  });

  it('プラズマシャワーの間は、ノーマル技がでんき技になる', async () => {
    // Arrange
    const engine = setup({ sideState: { global: { ionDeluge: true } } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert: でんき技はじめんタイプに効かない
    expect(engine.status(2).currentHp).toBe(160);
  });

  it('プラズマシャワーは、ノーマル以外の技を変えない', async () => {
    // Arrange
    const engine = setup({ sideState: { global: { ionDeluge: true } } });

    // Act
    await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160 - 24);
  });

  it('そうでんされたポケモンの技は、どのタイプでもでんき技になる', async () => {
    // Arrange
    const engine = setup({ volatileState: { electrified: true } });

    // Act
    await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
  });

  it('特性の modifyMoveType（-スキン）が先に変えたタイプは、プラズマシャワーで変わらない', async () => {
    // Arrange
    AbilityRegistry.register('テストのフェアリースキン', {
      modifyMoveType: (_pokemon, typeName) => (typeName === 'ノーマル' ? 'フェアリー' : undefined),
    });
    const engine = setup({
      sideState: { global: { ionDeluge: true } },
      ability: 'テストのフェアリースキン',
    });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert: フェアリー技として当たる
    expect(engine.status(2).currentHp).toBe(160 - 24);
  });

  it('使った技の、タイプを変える効果を反映したタイプを lastMoveTypeName に書く', async () => {
    // Arrange
    const engine = setup({ sideState: { global: { ionDeluge: true } } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert: 変化技（はねる）もでんきタイプになる（本家のプラズマシャワーも変化技を変える）
    expect(engine.status(1).volatileState.lastMoveTypeName).toBe('でんき');
    expect(engine.status(2).volatileState.lastMoveTypeName).toBe('でんき');
  });

  it('タイプを変える効果がなければ、技のタイプを lastMoveTypeName に書く', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: EMBER.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).volatileState.lastMoveTypeName).toBe('ほのお');
  });

  it('呼ばれた技（ゆびをふる → ひのこ）も、そのタイプを lastMoveTypeName に書く（本家の lastMoveUsed）', async () => {
    // Arrange
    const metronome = createTestMove(6, 'ゆびをふる', { category: MoveCategory.Status });
    MoveRegistry.register('ゆびをふる', {
      onUse: async (_a, _d, ctx: BattleContext) =>
        ctx.callMove!({ moveName: 'ひのこ', calledBy: 'ゆびをふる' }),
    });
    const engine = createBattleEngine({
      moves: [...MOVES, metronome],
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [metronome.id], types: ['みず'] },
        { id: 2, trainerId: 2, active: true, moveIds: [1], types: ['じめん'], baseSpeed: 50 },
      ],
    });

    // Act
    await engine.runTurn({ moveId: metronome.id }, { moveId: SPLASH.id });

    // Assert: lastMoveId は呼んだ技のまま
    expect(engine.status(1).volatileState.lastMoveTypeName).toBe('ほのお');
    expect(engine.status(1).volatileState.lastMoveId).toBe(metronome.id);
  });

  it('タイプなしの技（わるあがき）を出すと、lastMoveTypeName を消す', async () => {
    // Arrange
    const struggle = createTestMove(7, 'わるあがき');
    const engine = createBattleEngine({
      moves: [...MOVES, struggle],
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          moveIds: [struggle.id],
          types: ['みず'],
          volatileState: { lastMoveTypeName: 'みず' },
        },
        { id: 2, trainerId: 2, active: true, moveIds: [1], baseSpeed: 50 },
      ],
    });

    // Act
    await engine.runTurn({ moveId: struggle.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).volatileState.lastMoveTypeName).toBeUndefined();
  });

  describe('-スキンの 1.2 倍（ctx.moveTypeChangedByAbility）', () => {
    const WEATHER_BALL = createTestMove(4, 'テストのウェザーボール');
    const TECHNO_BLAST = createTestMove(5, 'テストのテクノバスター');
    const SKIN_MOVES = [...MOVES, WEATHER_BALL, TECHNO_BLAST];

    /**
     * ノーマル技をフェアリー技にし（テクノバスターは変えない）、特性が技のタイプを変えたときだけ威力を 1.2 倍にする
     * 相手はノーマルタイプ（どのタイプも等倍）。威力 50 なら 24、1.2 倍の 60 なら 28 ダメージ
     */
    const setupSkin = (sideState?: SideState) => {
      AbilityRegistry.register('テストのフェアリースキン', {
        modifyMoveType: (_pokemon, typeName, ctx) =>
          typeName === 'ノーマル' && ctx?.moveName !== TECHNO_BLAST.name ? 'フェアリー' : undefined,
        modifyBasePower: (_pokemon, power, ctx) =>
          ctx?.moveTypeChangedByAbility === true ? Math.floor(power * 1.2) : undefined,
      });
      return createBattleEngine({
        moves: SKIN_MOVES,
        sideState,
        pokemon: [
          {
            id: 1,
            trainerId: 1,
            active: true,
            moveIds: SKIN_MOVES.map(move => move.id),
            types: ['みず'],
            ability: 'テストのフェアリースキン',
          },
          { id: 2, trainerId: 2, active: true, moveIds: [1], baseSpeed: 50 },
        ],
      });
    };

    it('特性がノーマル技のタイプを変えたら、1.2 倍になる', async () => {
      // Arrange
      const engine = setupSkin();

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160 - 28);
    });

    it('技が先にタイプを変えた（晴れのウェザーボール）ときは、特性は変えず 1.2 倍にならない', async () => {
      // Arrange
      MoveRegistry.register(WEATHER_BALL.name, { modifyMoveType: () => 'ほのお' });
      const engine = setupSkin();

      // Act
      await engine.runTurn({ moveId: WEATHER_BALL.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.lastMoveTypeName).toBe('ほのお');
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('特性が変えず、プラズマシャワーでだけタイプが変わった技は、1.2 倍にならない', async () => {
      // Arrange
      const engine = setupSkin({ global: { ionDeluge: true } });

      // Act
      await engine.runTurn({ moveId: TECHNO_BLAST.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.lastMoveTypeName).toBe('でんき');
      expect(engine.status(2).currentHp).toBe(160 - 24);
    });

    it('特性が変えた技は、プラズマシャワーの間も 1.2 倍になる', async () => {
      // Arrange
      const engine = setupSkin({ global: { ionDeluge: true } });

      // Act
      await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

      // Assert
      expect(engine.status(1).volatileState.lastMoveTypeName).toBe('フェアリー');
      expect(engine.status(2).currentHp).toBe(160 - 28);
    });
  });
});
