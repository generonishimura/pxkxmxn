import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * マジックコート・マジックミラー・ミラクルスキン・きんしのちからを、レジストリに登録した名前で
 * エンジン全体に通して確かめる
 * ポケモン 1 は素早さ種族値 150（速い）、ポケモン 2 は 100
 */
describe('ExecuteTurnUseCase - 変化技に関わる技・特性', () => {
  const SPLASH = createTestMove(1, 'はねる', { category: MoveCategory.Status });
  const THUNDER_WAVE = createTestMove(2, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
    accuracy: 90,
  });
  const TACKLE = createTestMove(3, 'たいあたり', { power: 40 });
  const MAGIC_COAT = createTestMove(4, 'マジックコート', {
    type: 'エスパー',
    category: MoveCategory.Status,
    priority: 4,
  });
  const moves = [SPLASH, THUNDER_WAVE, TACKLE, MAGIC_COAT];

  const setup = (options: { attackerAbility?: string; defenderAbility?: string } = {}) =>
    createBattleEngine({
      moves,
      pokemon: [
        {
          id: 1,
          trainerId: 1,
          active: true,
          baseSpeed: 150,
          ability: options.attackerAbility,
          moveIds: [1, 2, 3],
        },
        {
          id: 2,
          trainerId: 2,
          active: true,
          ability: options.defenderAbility,
          moveIds: [1, 2, 3, 4],
        },
      ],
    });

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    MoveRegistry.clear();
    MoveRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('マジックコートを先に使えば、同じターンに受けたでんじはを使用者に返す', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = setup();

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: MAGIC_COAT.id });

    // Assert
    expect(result.actions[0].result).toBe('Used マジックコート shrouded itself with Magic Coat!');
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('マジックコートの状態は、ターンの終わりに消える', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: SPLASH.id }, { moveId: MAGIC_COAT.id });

    // Assert
    expect(engine.status(2).volatileState.magicCoat).toBeUndefined();
  });

  it('マジックミラーの相手に使ったでんじはは、使用者に返る', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = setup({ defenderAbility: 'マジックミラー' });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Paralysis);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('ミラクルスキンの相手には、命中 90 の変化技が命中 50 になって外れることがある', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const engine = setup({ defenderAbility: 'ミラクルスキン' });

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions[0].result).toBe('Used でんじは but it missed');
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('ミラクルスキンは、かたやぶりで無視される', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.6);
    const engine = setup({ attackerAbility: 'かたやぶり', defenderAbility: 'ミラクルスキン' });

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('きんしのちからの変化技は、速くても同じ優先度の相手より後に動き、相手の特性を無視する', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = setup({ attackerAbility: 'きんしのちから', defenderAbility: 'じゅうなん' });

    // Act
    const result = await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions.map(action => action.trainerId)).toEqual([2, 1]);
    expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
  });

  it('きんしのちからでも、攻撃技なら素早さの順に動く', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.5);
    const engine = setup({ attackerAbility: 'きんしのちから' });

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });

    // Assert
    expect(result.actions.map(action => action.trainerId)).toEqual([1, 2]);
  });
});
