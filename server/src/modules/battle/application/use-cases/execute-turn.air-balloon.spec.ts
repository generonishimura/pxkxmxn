import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { ItemRegistry } from '@/modules/pokemon/domain/items/item-registry';
import {
  HarnessPokemon,
  createBattleEngine,
  createTestMove,
} from '../__tests__/battle-engine-harness';

/**
 * ふうせん（じめん技を受けない。攻撃技を受けると割れる）を、エンジン全体で確かめる
 * トレーナー 1: 場の 1（速い）・控えの 3。トレーナー 2: 場の 2。最大 HP は 160
 */
describe('ExecuteTurnUseCase - ふうせん', () => {
  const EARTHQUAKE = createTestMove(1, 'じしん', { type: 'じめん', power: 100 });
  const TACKLE = createTestMove(2, 'たいあたり', { power: 40 });
  const SPLASH = createTestMove(3, 'はねる', { category: MoveCategory.Status });
  const moves = [EARTHQUAKE, TACKLE, SPLASH];
  const allMoveIds = moves.map(m => m.id);
  const BALLOON = { persistentState: { item: 'ふうせん' } };

  const setup = (
    options: {
      p2?: Partial<HarnessPokemon>;
      p3?: Partial<HarnessPokemon>;
      sideState?: Parameters<typeof createBattleEngine>[0]['sideState'];
    } = {},
  ) =>
    createBattleEngine({
      moves,
      sideState: options.sideState,
      pokemon: [
        { id: 1, trainerId: 1, active: true, baseSpeed: 150, moveIds: allMoveIds },
        { id: 2, trainerId: 2, active: true, baseSpeed: 50, moveIds: allMoveIds, ...options.p2 },
        { id: 3, trainerId: 1, moveIds: allMoveIds, ...options.p3 },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    ItemRegistry.initialize();
  });

  it('じめん技を受けない。ふうせんは割れない', async () => {
    // Arrange
    const engine = setup({ p2: BALLOON });

    // Act
    await engine.runTurn({ moveId: EARTHQUAKE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
    expect(engine.status(2).persistentState.item).toBe('ふうせん');
  });

  it('じめん以外の攻撃技を受けると割れる（使い切る）', async () => {
    // Arrange
    const engine = setup({ p2: BALLOON });

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBeLessThan(160);
    expect(engine.status(2).persistentState.item).toBeUndefined();
    expect(engine.status(2).persistentState.consumedItem).toBe('ふうせん');
    expect(result.actions[0].result).toContain('ふうせん popped!');
  });

  it('割れたあとは、じめん技を受ける', async () => {
    // Arrange
    const engine = setup({ p2: BALLOON });
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
    const hpAfterPop = engine.status(2).currentHp;

    // Act
    await engine.runTurn({ moveId: EARTHQUAKE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBeLessThan(hpAfterPop);
  });

  it('じゅうりょくの間は、じめん技を受けて割れる', async () => {
    // Arrange
    const engine = setup({ p2: BALLOON, sideState: { global: { gravityTurns: 5 } } });

    // Act
    await engine.runTurn({ moveId: EARTHQUAKE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBeLessThan(160);
    expect(engine.status(2).persistentState.item).toBeUndefined();
  });

  it('みがわりに当たったときは割れない', async () => {
    // Arrange
    const engine = setup({ p2: { ...BALLOON, volatileState: { substituteHp: 100 } } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).persistentState.item).toBe('ふうせん');
  });

  it('場に出たとき、地面にいないのでまきびしのダメージを受けない', async () => {
    // Arrange
    const engine = setup({ p3: BALLOON, sideState: { sides: { '1': { spikesLayers: 3 } } } });

    // Act
    await engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(3).isActive).toBe(true);
    expect(engine.status(3).currentHp).toBe(160);
  });
});
