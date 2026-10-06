import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { MeFirstEffect } from '@/modules/pokemon/domain/moves/effects/me-first-effect';
import { CopycatEffect } from '@/modules/pokemon/domain/moves/effects/copycat-effect';
import { InstructEffect } from '@/modules/pokemon/domain/moves/effects/instruct-effect';
import { SleepTalkEffect } from '@/modules/pokemon/domain/moves/effects/sleep-talk-effect';
import { NaturePowerEffect } from '@/modules/pokemon/domain/moves/effects/nature-power-effect';
import { Battle, BattleStatus, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  NORMAL,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

const moveOf = (id: number, name: string, category: MoveCategory, power: number | null): Move =>
  new Move(id, name, name, NORMAL, category, power, 100, 10, 0, null);

const TACKLE = moveOf(2, 'たいあたり', MoveCategory.Physical, 40);

describe('MoveExecutorService - 別の技を出す技・特性', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('さきどり: 相手がこれから出すダメージ技を、威力 1.5 倍で先に出す', async () => {
    // Arrange
    const meFirst = moveOf(1, 'さきどり', MoveCategory.Status, null);
    const { service, battle, statuses, calculate } = setupMoveExecutor({
      move: meFirst,
      moves: [meFirst, TACKLE],
      moveEffects: { さきどり: new MeFirstEffect() },
    });

    // Act
    const message = await service.executeMove(
      battle,
      ATTACKER_ID,
      1,
      statuses.get(ATTACKER_ID)!,
      statuses.get(DEFENDER_ID)!,
      1,
      { defenderPendingMoveId: TACKLE.id },
    );

    // Assert
    expect(message).toBe('Used さきどり Used たいあたり and dealt 10 damage');
    expect(calculate.mock.calls[0][0].move.power).toBe(60);
  });

  it('さきどり: 相手がもう行動していれば失敗する', async () => {
    // Arrange
    const meFirst = moveOf(1, 'さきどり', MoveCategory.Status, null);
    const { execute } = setupMoveExecutor({
      move: meFirst,
      moves: [meFirst, TACKLE],
      moveEffects: { さきどり: new MeFirstEffect() },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used さきどり but it failed');
  });

  it('まねっこ: バトルで最後に出た技を出す', async () => {
    // Arrange
    const copycat = moveOf(1, 'まねっこ', MoveCategory.Status, null);
    const { service, statuses } = setupMoveExecutor({
      move: copycat,
      moves: [copycat, TACKLE],
      moveEffects: { まねっこ: new CopycatEffect() },
    });
    const battle = new Battle(1, 1, 2, 1, 2, 2, null, null, BattleStatus.Active, null, {
      global: { lastMoveId: TACKLE.id },
    });

    // Act
    const message = await service.executeMove(
      battle,
      ATTACKER_ID,
      1,
      statuses.get(ATTACKER_ID)!,
      statuses.get(DEFENDER_ID)!,
      1,
    );

    // Assert
    expect(message).toBe('Used まねっこ Used たいあたり and dealt 10 damage');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('さいはい: 相手に最後の技をもう一度出させ、相手の PP を減らす', async () => {
    // Arrange
    const instruct = moveOf(1, 'さいはい', MoveCategory.Status, null);
    const { execute, statuses, battleRepository } = setupMoveExecutor({
      move: instruct,
      moves: [instruct, TACKLE],
      moveEffects: { さいはい: new InstructEffect() },
      defender: { volatileState: { lastMoveId: TACKLE.id } },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockImplementation(
      (statusId: number) =>
        Promise.resolve(
          statusId === DEFENDER_ID
            ? [new BattlePokemonMove(5, DEFENDER_ID, TACKLE.id, 10, 35)]
            : [new BattlePokemonMove(1, ATTACKER_ID, instruct.id, 15, 15)],
        ),
    );

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used さいはい Used たいあたり and dealt 10 damage');
    expect(statuses.get(ATTACKER_ID).currentHp).toBe(90);
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(5, { currentPp: 9 });
  });

  // 既知の制限: 本家では、おどり技を出したポケモン自身はまねないので 1 回だけ出す。
  // エンジンが呼ばれた技の使用者を見ずにおどりこを呼ぶため、いまは 2 回出す（直したらこのテストも直す）
  it('さいはい: おどりこを持つ相手に おどり技を出させると、相手が自分でまねて 2 回出す（既知の制限）', async () => {
    // Arrange
    const instruct = moveOf(1, 'さいはい', MoveCategory.Status, null);
    const quiverDance = moveOf(3, 'ちょうのまい', MoveCategory.Status, null);
    const onUse = jest.fn().mockResolvedValue(null);
    const { execute, battleRepository } = setupMoveExecutor({
      move: instruct,
      moves: [instruct, quiverDance],
      moveEffects: { さいはい: new InstructEffect(), ちょうのまい: { onUse } },
      defenderAbility: 'おどりこ',
      defender: { volatileState: { lastMoveId: quiverDance.id } },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockImplementation(
      (statusId: number) =>
        Promise.resolve(
          statusId === DEFENDER_ID
            ? [new BattlePokemonMove(5, DEFENDER_ID, quiverDance.id, 10, 20)]
            : [new BattlePokemonMove(1, ATTACKER_ID, instruct.id, 15, 15)],
        ),
    );

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used さいはい Used ちょうのまい Used ちょうのまい');
    expect(onUse.mock.calls.map(call => call[0].id)).toEqual([DEFENDER_ID, DEFENDER_ID]);
  });

  it('ねごと: ねむっていても出せ、自分の技から選んだ技を出す', async () => {
    // Arrange
    const sleepTalk = moveOf(1, 'ねごと', MoveCategory.Status, null);
    const { execute, statuses, battleRepository } = setupMoveExecutor({
      move: sleepTalk,
      moves: [sleepTalk, TACKLE],
      moveEffects: { ねごと: new SleepTalkEffect() },
      attacker: { statusCondition: StatusCondition.Sleep },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, ATTACKER_ID, sleepTalk.id, 10, 10),
      new BattlePokemonMove(2, ATTACKER_ID, TACKLE.id, 35, 35),
    ]);

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used ねごと Used たいあたり and dealt 10 damage');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('ねごと: ねむっていなければ失敗する', async () => {
    // Arrange
    const sleepTalk = moveOf(1, 'ねごと', MoveCategory.Status, null);
    const { execute } = setupMoveExecutor({
      move: sleepTalk,
      moves: [sleepTalk, TACKLE],
      moveEffects: { ねごと: new SleepTalkEffect() },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used ねごと but it failed');
  });

  it('しぜんのちから: エレキフィールドなら１０まんボルトを出す', async () => {
    // Arrange
    const naturePower = moveOf(1, 'しぜんのちから', MoveCategory.Status, null);
    const thunderbolt = moveOf(3, '１０まんボルト', MoveCategory.Special, 90);
    const { service, statuses } = setupMoveExecutor({
      move: naturePower,
      moves: [naturePower, thunderbolt],
      moveEffects: { しぜんのちから: new NaturePowerEffect() },
    });
    const battle = new Battle(
      1,
      1,
      2,
      1,
      2,
      1,
      null,
      Field.ElectricTerrain,
      BattleStatus.Active,
      null,
    );

    // Act
    const message = await service.executeMove(
      battle,
      ATTACKER_ID,
      1,
      statuses.get(ATTACKER_ID)!,
      statuses.get(DEFENDER_ID)!,
      1,
    );

    // Assert
    expect(message).toBe('Used しぜんのちから Used １０まんボルト and dealt 10 damage');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('おどりこ: 相手がおどり技を出したあと、同じ技を自分も出す', async () => {
    // Arrange
    const quiverDance = moveOf(1, 'ちょうのまい', MoveCategory.Status, null);
    const onUse = jest.fn().mockResolvedValue(null);
    const { execute } = setupMoveExecutor({
      move: quiverDance,
      moveEffect: { onUse },
      defenderAbility: 'おどりこ',
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used ちょうのまい Used ちょうのまい');
    expect(onUse).toHaveBeenCalledTimes(2);
    expect(onUse.mock.calls[1][0].id).toBe(DEFENDER_ID);
  });

  it('おどりこ: はなびらのまいをまねても、自分は出し続ける状態にならない', async () => {
    // Arrange
    const petalDance = moveOf(1, 'はなびらのまい', MoveCategory.Special, 120);
    const { execute, statuses } = setupMoveExecutor({
      move: petalDance,
      defenderAbility: 'おどりこ',
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe(
      'Used はなびらのまい and dealt 10 damage Used はなびらのまい and dealt 10 damage',
    );
    expect(statuses.get(DEFENDER_ID).volatileState.lockedInMove).toBeUndefined();
    expect(statuses.get(ATTACKER_ID).volatileState.lockedInMove?.moveId).toBe(petalDance.id);
  });

  it('おどりこ: ねむっていれば、おどり技を出せない', async () => {
    // Arrange
    const quiverDance = moveOf(1, 'ちょうのまい', MoveCategory.Status, null);
    const onUse = jest.fn().mockResolvedValue(null);
    const { execute } = setupMoveExecutor({
      move: quiverDance,
      moveEffect: { onUse },
      defenderAbility: 'おどりこ',
      defender: { statusCondition: StatusCondition.Sleep },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used ちょうのまい Cannot act due to sleep');
    expect(onUse).toHaveBeenCalledTimes(1);
  });

  it('おどりこ: おどり技でなければ出さない', async () => {
    // Arrange
    const onUse = jest.fn().mockResolvedValue(null);
    const { execute } = setupMoveExecutor({
      move: moveOf(1, 'こうそくいどう', MoveCategory.Status, null),
      moveEffect: { onUse },
      defenderAbility: 'おどりこ',
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used こうそくいどう');
    expect(onUse).toHaveBeenCalledTimes(1);
  });
});
