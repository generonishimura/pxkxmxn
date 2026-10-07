import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import { createBattleEngine, createTestMove } from '../__tests__/battle-engine-harness';

/**
 * まもる系の技（登録済みの本物の技の効果）
 * ポケモン 1 がたいあたり（接触）・みずでっぽう（接触しない）・でんじは（変化技）を使い、
 * ポケモン 2 がまもる系を使う。どちらも最大 HP 160
 */
describe('ExecuteTurnUseCase - まもる・キングシールド・ブロッキング・スレッドトラップ・かえんのまもり', () => {
  const TACKLE = createTestMove(1, 'たいあたり');
  const WATER_GUN = createTestMove(2, 'みずでっぽう', {
    type: 'みず',
    category: MoveCategory.Special,
  });
  const THUNDER_WAVE = createTestMove(3, 'でんじは', {
    type: 'でんき',
    category: MoveCategory.Status,
  });
  const guard = (id: number, name: string) =>
    createTestMove(id, name, { category: MoveCategory.Status, priority: 4 });
  const PROTECT = guard(10, 'まもる');
  const KINGS_SHIELD = guard(11, 'キングシールド');
  const OBSTRUCT = guard(12, 'ブロッキング');
  const SILK_TRAP = guard(13, 'スレッドトラップ');
  const BURNING_BULWARK = guard(14, 'かえんのまもり');
  const GUARDS = [PROTECT, KINGS_SHIELD, OBSTRUCT, SILK_TRAP, BURNING_BULWARK];

  const setup = () =>
    createBattleEngine({
      moves: [TACKLE, WATER_GUN, THUNDER_WAVE, ...GUARDS],
      pokemon: [
        { id: 1, trainerId: 1, active: true, moveIds: [1, 2, 3] },
        { id: 2, trainerId: 2, active: true, moveIds: GUARDS.map(move => move.id) },
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

  it('まもるは、相手の攻撃技を防ぐ', async () => {
    // Arrange
    const engine = setup();

    // Act
    const result = await engine.runTurn({ moveId: TACKLE.id }, { moveId: PROTECT.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
    expect(result.actions.map(action => action.result)).toEqual([
      'Used まもる protected itself!',
      'Used たいあたり but it was blocked (まもる)',
    ]);
  });

  it('まもるは、相手の変化技も防ぐ', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: PROTECT.id });

    // Assert
    expect(engine.status(2).statusCondition).toBe(StatusCondition.None);
  });

  it('まもるを続けて使うと、2 回目は 1/3 の確率でしか成功しない', async () => {
    // Arrange
    const engine = setup();
    await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: PROTECT.id });
    jest.spyOn(Math, 'random').mockReturnValue(0.34);

    // Act
    const result = await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: PROTECT.id });

    // Assert
    expect(result.actions[0].result).toBe('Used まもる but it failed');
    expect(engine.status(2).currentHp).toBeLessThan(160);
  });

  it.each([
    ['キングシールド', 'attackRank', -1],
    ['ブロッキング', 'defenseRank', -2],
    ['スレッドトラップ', 'speedRank', -1],
  ] as const)('%s は、接触した相手の %s を %i にする', async (name, rank, expected) => {
    // Arrange
    const engine = setup();
    const guardMove = GUARDS.find(move => move.name === name)!;

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: guardMove.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
    expect(engine.status(1)[rank]).toBe(expected);
  });

  it('かえんのまもりは、接触した相手をやけどにする', async () => {
    // Arrange
    const engine = setup();

    // Act
    await engine.runTurn({ moveId: TACKLE.id }, { moveId: BURNING_BULWARK.id });

    // Assert
    expect(engine.status(2).currentHp).toBe(160);
    expect(engine.status(1).statusCondition).toBe(StatusCondition.Burn);
  });

  it.each(['キングシールド', 'ブロッキング', 'スレッドトラップ', 'かえんのまもり'])(
    '%s は、接触しない攻撃技を防ぐが、相手に効果を与えない',
    async name => {
      // Arrange
      const engine = setup();
      const guardMove = GUARDS.find(move => move.name === name)!;

      // Act
      await engine.runTurn({ moveId: WATER_GUN.id }, { moveId: guardMove.id });

      // Assert
      expect(engine.status(2).currentHp).toBe(160);
      expect(engine.status(1).attackRank).toBe(0);
      expect(engine.status(1).defenseRank).toBe(0);
      expect(engine.status(1).speedRank).toBe(0);
      expect(engine.status(1).statusCondition).toBe(StatusCondition.None);
    },
  );

  it.each(['キングシールド', 'ブロッキング', 'スレッドトラップ', 'かえんのまもり'])(
    '%s は、変化技を防がない',
    async name => {
      // Arrange
      const engine = setup();
      const guardMove = GUARDS.find(move => move.name === name)!;

      // Act
      await engine.runTurn({ moveId: THUNDER_WAVE.id }, { moveId: guardMove.id });

      // Assert
      expect(engine.status(2).statusCondition).toBe(StatusCondition.Paralysis);
    },
  );
});
