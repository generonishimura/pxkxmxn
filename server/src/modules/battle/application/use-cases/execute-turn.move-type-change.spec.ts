import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
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
});
