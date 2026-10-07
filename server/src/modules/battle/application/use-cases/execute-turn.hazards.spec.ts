import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { SideConditions, getSideConditions } from '../../domain/state/side-state';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * 交代で出てきたポケモンへの設置技と、いやしのねがい・みかづきのまい（エンジン全体）
 * トレーナー 1 は場のポケモン 1 から控えのポケモン 3 に交代する。最大 HP は 160
 */
describe('ExecuteTurnUseCase - 場に出たときの設置技', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });

  const setup = (
    side1: SideConditions,
    incoming: {
      types?: string[];
      ability?: string;
      currentHp?: number;
      statusCondition?: StatusCondition;
    } = {},
  ) =>
    createBattleEngine({
      moves: [SPLASH],
      sideState: { sides: { '1': side1 } },
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [1] },
        { id: 3, trainerId: 1, moveIds: [1], ...incoming },
        { id: 2, trainerId: 2, active: true, moveIds: [1] },
      ],
    });

  const switchIn = async (engine: ReturnType<typeof setup>) =>
    engine.runTurn({ switchPokemonId: 3 }, { moveId: SPLASH.id });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  it('ステルスロックは、いわの相性に応じて最大 HP の 1/8 を基準にダメージを与える', async () => {
    // Arrange
    const engine = setup({ stealthRock: true }, { types: ['ほのお', 'ひこう'] });

    // Act
    await switchIn(engine);

    // Assert: いわはほのお・ひこうに 2 倍ずつで 4 倍 → 160 × 4 / 8 = 80
    expect(engine.status(3).currentHp).toBe(80);
  });

  it('まきびし 2 層は、地面にいるポケモンに最大 HP の 1/6 のダメージを与える', async () => {
    // Arrange
    const engine = setup({ spikesLayers: 2 });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).currentHp).toBe(134);
  });

  it('まきびしは、ひこうタイプには効かない', async () => {
    // Arrange
    const engine = setup({ spikesLayers: 3 }, { types: ['ひこう'] });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).currentHp).toBe(160);
  });

  it('どくびし 1 層はどく、2 層はもうどくにする', async () => {
    // Arrange
    const one = setup({ toxicSpikesLayers: 1 });
    const two = setup({ toxicSpikesLayers: 2 });

    // Act
    await switchIn(one);
    await switchIn(two);

    // Assert
    expect(one.status(3).statusCondition).toBe(StatusCondition.Poison);
    expect(two.status(3).statusCondition).toBe(StatusCondition.BadPoison);
  });

  it('地面にいるどくタイプが出てくると、どくびしが消える', async () => {
    // Arrange
    const engine = setup({ toxicSpikesLayers: 2, spikesLayers: 1 }, { types: ['どく'] });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).statusCondition).toBe(StatusCondition.None);
    expect(getSideConditions(engine.battle().sideState, 1)).toEqual({ spikesLayers: 1 });
  });

  it('しんぴのまもりの陣営では、どくびしでどくにならない', async () => {
    // Arrange
    const engine = setup({ toxicSpikesLayers: 1, safeguardTurns: 3 });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).statusCondition).toBe(StatusCondition.None);
  });

  it('どくびしでどくになったシンクロのポケモンは、相手をどくにしない', async () => {
    // Arrange
    const engine = setup({ toxicSpikesLayers: 1 }, { ability: 'シンクロ' });

    // Act
    const result = await switchIn(engine);

    // Assert
    expect(engine.status(3).statusCondition).toBe(StatusCondition.Poison);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    expect(result.actions[0].result).not.toContain('Synchronize activated!');
  });

  it('ねばねばネットは、地面にいるポケモンの素早さを 1 段階下げる', async () => {
    // Arrange
    const engine = setup({ stickyWeb: true });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).speedRank).toBe(-1);
  });

  it('設置技でひんしになったポケモンの、場に出たときの特性は発動しない', async () => {
    // Arrange
    const onEntry = jest.fn();
    AbilityRegistry.register('テストのとくせい', { onEntry });
    const engine = setup({ stealthRock: true }, { currentHp: 10, ability: 'テストのとくせい' });

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).isFainted()).toBe(true);
    expect(onEntry).not.toHaveBeenCalled();
  });

  it('設置技のダメージは、交代の結果に入る', async () => {
    // Arrange
    const engine = setup({ stealthRock: true });

    // Act
    const result = await switchIn(engine);

    // Assert
    expect(result.actions[0].result).toContain('Pointed stones dug into the Pokemon! (20 damage)');
  });

  it('いやしのねがいは、出てきたポケモンの HP と状態異常を回復してから設置技を受ける', async () => {
    // Arrange
    const engine = setup(
      { healingWish: 'healingWish', stealthRock: true },
      { currentHp: 30, statusCondition: StatusCondition.Burn },
    );

    // Act
    await switchIn(engine);

    // Assert
    expect(engine.status(3).currentHp).toBe(140);
    expect(engine.status(3).statusCondition).toBe(StatusCondition.None);
    expect(getSideConditions(engine.battle().sideState, 1).healingWish).toBeUndefined();
  });

  it('いやしのねがいは、元気なポケモンが出てきたときは次まで残る', async () => {
    // Arrange
    const engine = setup({ healingWish: 'healingWish' });

    // Act
    await switchIn(engine);

    // Assert
    expect(getSideConditions(engine.battle().sideState, 1).healingWish).toBe('healingWish');
  });

  it('みかづきのまいは、出てきたポケモンの PP も回復する', async () => {
    // Arrange
    const engine = setup({ healingWish: 'lunarDance' }, { currentHp: 50 });
    const [slot] = await engine.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(3);
    await engine.battleRepository.updateBattlePokemonMove(slot.id, { currentPp: 2 });

    // Act
    await switchIn(engine);

    // Assert
    const [healed] = await engine.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(3);
    expect(healed.currentPp).toBe(10);
    expect(engine.status(3).currentHp).toBe(160);
  });
});
