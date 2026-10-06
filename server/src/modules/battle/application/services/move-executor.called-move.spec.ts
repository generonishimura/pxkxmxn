import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  NORMAL,
  MoveExecutorSetupOptions,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

const moveOf = (id: number, name: string, category: MoveCategory, power: number | null): Move =>
  new Move(id, name, name, NORMAL, category, power, 100, 10, 0, null);

const CALLER = moveOf(1, 'テストよびだし', MoveCategory.Status, null);
const CALLED = moveOf(2, 'テストよばれる', MoveCategory.Physical, 80);

/**
 * ID 1 の技（呼び出す側）が、ID 2 の技（呼ばれる側）を呼ぶ
 */
const setupCalledMove = (callerEffect: IMoveEffect, options: MoveExecutorSetupOptions = {}) =>
  setupMoveExecutor({
    move: CALLER,
    moves: [CALLER, CALLED],
    moveEffects: { [CALLER.name]: callerEffect },
    ...options,
  });

describe('MoveExecutorService - 別の技を出す（callMove）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('技の効果から callMove で、別の技を技の流れに乗せて出せる', async () => {
    // Arrange
    const { execute, statuses } = setupCalledMove({
      onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 2, calledBy: 'テストよびだし' }),
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used テストよびだし Used テストよばれる and dealt 10 damage');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('呼ばれた技は PP を減らさず、使用者の lastMoveId は呼んだ技のまま', async () => {
    // Arrange
    const { execute, statuses, battleRepository } = setupCalledMove({
      onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 2, calledBy: 'テストよびだし' }),
    });

    // Act
    await execute();

    // Assert
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledTimes(1);
    expect(statuses.get(ATTACKER_ID).volatileState.lastMoveId).toBe(1);
    expect(battleRepository.patchGlobalFieldState).toHaveBeenLastCalledWith(1, { lastMoveId: 2 });
  });

  it('技名で呼べる（ゆびをふる・しぜんのちから）', async () => {
    // Arrange
    const { execute, statuses } = setupCalledMove({
      onUse: (_a, _d, ctx) => ctx.callMove!({ moveName: 'テストよばれる', calledBy: 'ゆびをふる' }),
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('呼ばれた技の中では、calledBy に呼び出した技の名前が入る', async () => {
    // Arrange
    let calledBy: string | undefined;
    const { execute } = setupCalledMove(
      { onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 2, calledBy: 'ねごと' }) },
      {
        moveEffects: {
          [CALLER.name]: {
            onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 2, calledBy: 'ねごと' }),
          },
          [CALLED.name]: {
            onHit: (_a, _d, ctx) => {
              calledBy = ctx.calledBy;
              return Promise.resolve(null);
            },
          },
        },
      },
    );

    // Act
    await execute();

    // Assert
    expect(calledBy).toBe('ねごと');
  });

  it('powerMultiplier で威力を変えられる（さきどり = 1.5）', async () => {
    // Arrange
    const { execute, calculate } = setupCalledMove({
      onUse: (_a, _d, ctx) =>
        ctx.callMove!({ moveId: 2, calledBy: 'さきどり', powerMultiplier: 1.5 }),
    });

    // Act
    await execute();

    // Assert
    expect(calculate.mock.calls[0][0].move.power).toBe(120);
  });

  it('技を出すポケモンを変えられる（さいはい）', async () => {
    // Arrange
    const { execute, statuses } = setupCalledMove({
      onUse: (_a, defender, ctx) =>
        ctx.callMove!({ moveId: 2, calledBy: 'さいはい', user: defender }),
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).currentHp).toBe(90);
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('呼び出しが深くなりすぎると失敗する', async () => {
    // Arrange
    const { execute } = setupCalledMove({
      onUse: (_a, _d, ctx) => ctx.callMove!({ moveId: 1, calledBy: 'テストよびだし' }),
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('But it failed');
  });

  it('相手がよこどりを使っていると、奪われる変化技は相手が出す', async () => {
    // Arrange
    const onUse = jest.fn().mockResolvedValue("'s Attack rose sharply!");
    const swordsDance = moveOf(1, 'つるぎのまい', MoveCategory.Status, null);
    const { execute, statuses } = setupMoveExecutor({
      move: swordsDance,
      moveEffect: { onUse },
      defender: { volatileState: { snatch: true } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('Used つるぎのまい but it was snatched!');
    expect(onUse.mock.calls[0][0].id).toBe(DEFENDER_ID);
    expect(statuses.get(DEFENDER_ID).volatileState.snatch).toBeUndefined();
  });

  it('相手の技のあとに、自分の特性の onOpponentMoveUsed を呼ぶ（おどりこ）', async () => {
    // Arrange
    const swordsDance = moveOf(1, 'つるぎのまい', MoveCategory.Status, null);
    const onOpponentMoveUsed = jest.fn(
      (_holder, _user, ctx: { moveName?: string; callMove?: (r: object) => Promise<string> }) =>
        ctx.callMove!({ moveId: 1, calledBy: 'おどりこ' }),
    );
    AbilityRegistry.register('テストおどりこ', { onOpponentMoveUsed });
    const onUse = jest.fn().mockResolvedValue(null);
    const { execute } = setupMoveExecutor({
      move: swordsDance,
      moveEffect: { onUse },
      defenderAbility: 'テストおどりこ',
    });

    // Act
    const message = await execute();

    // Assert
    expect(onOpponentMoveUsed.mock.calls[0][2].moveName).toBe('つるぎのまい');
    expect(onUse).toHaveBeenCalledTimes(2);
    expect(onUse.mock.calls[1][0].id).toBe(DEFENDER_ID);
    expect(message).toBe('Used つるぎのまい Used つるぎのまい');
  });
});

describe('MoveExecutorService - みらいよちが当たる（executeFutureAttacks）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  const battleWithFutureAttack = (turns: number): Battle =>
    new Battle(1, 1, 2, 1, 2, 3, null, null, BattleStatus.Active, null, {
      sides: { [String(DEFENDER_ID)]: { futureAttack: { turns, moveId: 7, sourceStatusId: 1 } } },
    });

  it('残りターン数が 1 の陣営の場のポケモンに、技を使ったポケモンの能力で当てる', async () => {
    // Arrange
    const futureSight = moveOf(7, 'みらいよち', MoveCategory.Special, 120);
    const { service, statuses, battleRepository } = setupMoveExecutor({ moves: [futureSight] });
    const battle = battleWithFutureAttack(1);
    battleRepository.findById.mockResolvedValue(battle);

    // Act
    const messages = await service.executeFutureAttacks(battle);

    // Assert
    expect(messages).toEqual([{ trainerId: 1, message: 'Used みらいよち and dealt 10 damage' }]);
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    expect(battleRepository.patchSideConditions).not.toHaveBeenCalled();
    expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
  });

  it('残りターン数が 1 でなければ、まだ当てない', async () => {
    // Arrange
    const futureSight = moveOf(7, 'みらいよち', MoveCategory.Special, 120);
    const { service, statuses, battleRepository } = setupMoveExecutor({ moves: [futureSight] });
    const battle = battleWithFutureAttack(2);
    battleRepository.findById.mockResolvedValue(battle);

    // Act
    const messages = await service.executeFutureAttacks(battle);

    // Assert
    expect(messages).toEqual([]);
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });
});
