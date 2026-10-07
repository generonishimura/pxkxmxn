import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { addEntryHazard } from '@/modules/pokemon/domain/battle-events/field-state';
import { getSideConditions } from '../../domain/state/side-state';
import { VolatileState } from '../../domain/state/volatile-state';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * マジックコート（volatileState.magicCoat）・マジックミラー（特性の bouncesMoves）で、
 * はね返せる技（MoveBehaviors の reflectable）を使用者に返す（エンジン全体）
 * ポケモン 1 が先に動いて技を使い、ポケモン 2 がはね返す
 */
describe('ExecuteTurnUseCase - 技をはね返す', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const THUNDER_WAVE = createTestMove(2, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const TACKLE = createTestMove(3, 'たいあたり');
  const SPIKES = createTestMove(4, 'まきびし', { type: 'じめん', category: MoveCategory.Status });
  const FLY = createTestMove(5, 'そらをとぶ', { type: 'ひこう', power: 90 });
  const moves = [SPLASH, THUNDER_WAVE, TACKLE, SPIKES, FLY];

  const setup = (
    options: {
      attackerAbility?: string;
      defenderAbility?: string;
      defenderVolatile?: VolatileState;
      defenderHp?: number;
    } = {},
  ) =>
    createBattleEngine({
      moves,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          ability: options.attackerAbility,
          moveIds: [1, 2, 3, 4],
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          ability: options.defenderAbility,
          volatileState: options.defenderVolatile,
          currentHp: options.defenderHp,
          moveIds: [1, 5],
        },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
    AbilityRegistry.register('テストのマジックミラー', { bouncesMoves: true });
    // まきびし相当: 相手の陣営にまきびしを置く
    MoveRegistry.register('まきびし', {
      onUse: async (_a: BattlePokemonStatus, defender: BattlePokemonStatus, ctx: BattleContext) =>
        (await addEntryHazard(ctx, defender.trainerId, 'spikes')) ? null : 'But it failed',
    });
  });

  it('マジックコートの相手に使ったはね返せる技は、使用者に返る', async () => {
    // Arrange
    const engine = setup({ defenderVolatile: { magicCoat: true } });

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
    expect(result.actions[0].result).toContain('was bounced back (マジックコート)');
  });

  it('特性の bouncesMoves（マジックミラー）でも、はね返せる技が使用者に返る', async () => {
    // Arrange
    const engine = setup({ defenderAbility: 'テストのマジックミラー' });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('はね返した技は、もう一度はね返されない（両方がマジックミラーでも 1 回だけ）', async () => {
    // Arrange
    const engine = setup({
      attackerAbility: 'テストのマジックミラー',
      defenderAbility: 'テストのマジックミラー',
    });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('マジックミラーは、かたやぶりで無視される', async () => {
    // Arrange
    const engine = setup({
      attackerAbility: 'かたやぶり',
      defenderAbility: 'テストのマジックミラー',
    });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('はね返せない技（攻撃技）は、はね返さない', async () => {
    // Arrange
    const engine = setup({ defenderVolatile: { magicCoat: true } });

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).currentHp).toBeLessThan(160);
    expect(engine.status(1).currentHp).toBe(160);
  });

  it('相手の陣営に置く技（まきびし）も、はね返されて使用者の陣営に置かれる', async () => {
    // Arrange
    const engine = setup({ defenderAbility: 'テストのマジックミラー' });

    // Act
    await engine.runTurn({ moveId: SPIKES.id }, { moveId: SPLASH.id });

    // Assert
    expect(getSideConditions(engine.battle().sideState, 1).spikesLayers).toBe(1);
    expect(getSideConditions(engine.battle().sideState, 2).spikesLayers).toBeUndefined();
  });

  it('隠れている相手（そらをとぶ）は、技をはね返さない', async () => {
    // Arrange
    const engine = setup({
      defenderAbility: 'テストのマジックミラー',
      defenderVolatile: { semiInvulnerable: 'air', chargingMoveId: FLY.id },
    });

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions[0].result).toBe('Used でんじは but it missed');
    expect(engine.status(1).statusCondition).toBe(StatusCondition.None);
  });

  it('ひんしの相手は、技をはね返さない（まきびしは相手の陣営に置かれる）', async () => {
    // Arrange
    const engine = setup({ defenderAbility: 'テストのマジックミラー', defenderHp: 0 });

    // Act
    const result = await engine.runTurn({ moveId: SPIKES.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions[0].result).not.toContain('bounced back');
    expect(getSideConditions(engine.battle().sideState, 2).spikesLayers).toBe(1);
    expect(getSideConditions(engine.battle().sideState, 1).spikesLayers).toBeUndefined();
  });
});
