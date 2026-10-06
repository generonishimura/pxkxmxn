import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { IMoveEffect } from '@/modules/pokemon/domain/moves/move-effect.interface';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { AccuracyCalculator } from '../../domain/logic/accuracy-calculator';
import { Battle, BattleStatus, Weather } from '../../domain/entities/battle.entity';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

const ELECTRIC = new Type(13, 'でんき', 'Electric');
const FIRE = new Type(10, 'ほのお', 'Fire');

describe('MoveExecutorService - 技の流れでエンジンが書く状態（MoveLifecycle）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('技を出した記録', () => {
    it('使用者の lastMoveId と、バトル全体の lastMoveId を書く', async () => {
      // Arrange
      const { execute, statuses, battleRepository } = setupMoveExecutor();

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.lastMoveId).toBe(1);
      expect(battleRepository.patchGlobalFieldState).toHaveBeenCalledWith(1, { lastMoveId: 1 });
    });

    it('locksMoveChoice の特性なら、出した技に固定する（ごりむちゅう）', async () => {
      // Arrange
      AbilityRegistry.register('テストこだわり', { locksMoveChoice: true });
      const { execute, statuses } = setupMoveExecutor({ attackerAbility: 'テストこだわり' });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.choiceLockedMoveId).toBe(1);
    });

    it('まもる系でない技を出すと、まもるを続けた回数を消す', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        attacker: { volatileState: { protectCount: 2 } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.protectCount).toBeUndefined();
    });

    it('同じ技を続けて当てると、consecutiveMoveCount を 1 増やす', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        attacker: { volatileState: { lastMoveId: 1, consecutiveMoveCount: 2 } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.consecutiveMoveCount).toBe(3);
    });

    it('別の技を出すと、技の処理の中では consecutiveMoveCount がない', async () => {
      // Arrange
      let countDuringMove: number | undefined = -1;
      const moveEffect: IMoveEffect = {
        onHit: attacker => {
          countDuringMove = attacker.volatileState.consecutiveMoveCount;
          return Promise.resolve(null);
        },
      };
      const { execute, statuses } = setupMoveExecutor({
        moveEffect,
        attacker: { volatileState: { lastMoveId: 99, consecutiveMoveCount: 4 } },
      });

      // Act
      await execute();

      // Assert
      expect(countDuringMove).toBeUndefined();
      expect(statuses.get(ATTACKER_ID).volatileState.consecutiveMoveCount).toBe(1);
    });
  });

  describe('PP', () => {
    it('相手の特性の modifyOpponentPpDeduction の分だけ、PP を余分に減らす（プレッシャー）', async () => {
      // Arrange
      AbilityRegistry.register('テストプレッシャー', { modifyOpponentPpDeduction: () => 1 });
      const { execute, battleRepository } = setupMoveExecutor({
        defenderAbility: 'テストプレッシャー',
      });

      // Act
      await execute();

      // Assert
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(1, { currentPp: 8 });
    });

    it('ものまねで入れ替わった技は、volatileState の PP を減らす', async () => {
      // Arrange
      const { execute, statuses, battleRepository } = setupMoveExecutor({
        attacker: {
          volatileState: {
            moveSlotOverrides: [{ battlePokemonMoveId: 1, moveId: 1, currentPp: 5, maxPp: 5 }],
          },
        },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(1, ATTACKER_ID, 50, 10, 10),
      ]);

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.moveSlotOverrides?.[0].currentPp).toBe(4);
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    });
  });

  describe('ため技', () => {
    it('1 ターン目はためて、ダメージを与えない。隠れる技なら semiInvulnerable を書く', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('あなをほる', MoveCategory.Physical, 80),
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used あなをほる and began charging');
      expect(statuses.get(ATTACKER_ID).volatileState.chargingMoveId).toBe(1);
      expect(statuses.get(ATTACKER_ID).volatileState.semiInvulnerable).toBe('underground');
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
    });

    it('2 ターン目は PP を減らさずに技を出し、ためた状態を消す', async () => {
      // Arrange
      const { execute, statuses, battleRepository } = setupMoveExecutor({
        move: createMove('あなをほる', MoveCategory.Physical, 80),
        attacker: { volatileState: { chargingMoveId: 1, semiInvulnerable: 'underground' } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
      expect(statuses.get(ATTACKER_ID).volatileState.chargingMoveId).toBeUndefined();
      expect(statuses.get(ATTACKER_ID).volatileState.semiInvulnerable).toBeUndefined();
      expect(battleRepository.updateBattlePokemonMove).not.toHaveBeenCalled();
    });

    it('chargeTurn.skipCharge が true なら、ためずに出す（晴れのソーラービーム）', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('ソーラービーム', MoveCategory.Special, 120),
        moveEffect: { chargeTurn: { skipCharge: () => true } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
      expect(statuses.get(ATTACKER_ID).volatileState.chargingMoveId).toBeUndefined();
    });

    it.each([
      ['ソーラービーム', Weather.Sun],
      ['ソーラーブレード', Weather.Sun],
      ['エレクトロビーム', Weather.Rain],
    ])(
      '%s は、%s ならためずに出す（技の効果がなくてもエンジンが判定する）',
      async (name, weather) => {
        // Arrange
        const { service, statuses } = setupMoveExecutor({
          move: createMove(name, MoveCategory.Special, 120),
        });
        const battle = new Battle(1, 1, 2, 1, 2, 1, weather, null, BattleStatus.Active, null);

        // Act
        await service.executeMove(
          battle,
          ATTACKER_ID,
          1,
          statuses.get(ATTACKER_ID),
          statuses.get(DEFENDER_ID),
          1,
        );

        // Assert
        expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
        expect(statuses.get(ATTACKER_ID).volatileState.chargingMoveId).toBeUndefined();
      },
    );

    it('ソーラービームは、晴れでなければ 1 ターンためる', async () => {
      // Arrange
      const { service, statuses } = setupMoveExecutor({
        move: createMove('ソーラービーム', MoveCategory.Special, 120),
      });
      const battle = new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, null, BattleStatus.Active, null);

      // Act
      const message = await service.executeMove(
        battle,
        ATTACKER_ID,
        1,
        statuses.get(ATTACKER_ID),
        statuses.get(DEFENDER_ID),
        1,
      );

      // Assert
      expect(message).toBe('Used ソーラービーム and began charging');
    });

    it('あなをほるで隠れている相手には、じしん以外は当たらない', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        defender: { volatileState: { semiInvulnerable: 'underground' } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used ほのおのパンチ but it missed');
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
    });

    it('あなをほるで隠れている相手にも、じしんは当たる', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('じしん', MoveCategory.Physical, 100),
        defender: { volatileState: { semiInvulnerable: 'underground' } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    });
  });

  describe('反動・出し続ける技', () => {
    it('はかいこうせんが当たると、次の行動は動けない（mustRecharge）', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('はかいこうせん', MoveCategory.Special, 150),
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.mustRecharge).toBe(true);
    });

    it('はかいこうせんが外れたら、反動はない', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('はかいこうせん', MoveCategory.Special, 150),
      });
      jest.spyOn(AccuracyCalculator, 'checkHit').mockReturnValue(false);

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.mustRecharge).toBeUndefined();
    });

    it('あばれるの 1 ターン目は、残りのターン数を lockedInMove に書く', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0.99);
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('あばれる', MoveCategory.Physical, 120),
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.lockedInMove).toEqual({
        moveId: 1,
        turns: 2,
      });
    });

    it('あばれるの最後のターンが終わると、lockedInMove を消してこんらんする', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('あばれる', MoveCategory.Physical, 120),
        attacker: { volatileState: { lastMoveId: 1, lockedInMove: { moveId: 1, turns: 1 } } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.lockedInMove).toBeUndefined();
      expect(statuses.get(ATTACKER_ID).volatileState.confusionTurns).toBeGreaterThanOrEqual(2);
      expect(message).toContain('became confused due to fatigue!');
    });

    it('lockedIn.preventsSleep の技を始めると uproar を書き、場のねむっているポケモンを起こす', async () => {
      // Arrange
      jest.spyOn(Math, 'random').mockReturnValue(0);
      const { execute, statuses, battleRepository } = setupMoveExecutor({
        move: createMove('さわぐ', MoveCategory.Special, 90),
        moveEffect: { lockedIn: { turns: 3, preventsSleep: true } },
        defender: { statusCondition: StatusCondition.Sleep },
      });
      battleRepository.findBattlePokemonStatusByBattleId.mockImplementation(() =>
        Promise.resolve([...statuses.values()]),
      );

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.uproar).toBe(true);
      expect(statuses.get(DEFENDER_ID).statusCondition).toBe(StatusCondition.None);
      expect(message).toContain('The uproar woke up the sleeping Pokemon!');
    });
  });

  describe('じゅうでん（charged）', () => {
    it('でんき技を出すと、charged を消す', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: new Move(
          1,
          '10まんボルト',
          'x',
          ELECTRIC,
          MoveCategory.Special,
          90,
          100,
          15,
          0,
          null,
        ),
        attacker: { volatileState: { charged: true } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.charged).toBeUndefined();
    });

    it('でんき以外の技では、charged を消さない', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        attacker: { volatileState: { charged: true } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.charged).toBe(true);
    });
  });

  describe('ふんじん', () => {
    it('ふんじんをかけられていると、ほのお技は失敗して最大 HP の 1/4 のダメージを受ける', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: new Move(1, 'かえんほうしゃ', 'x', FIRE, MoveCategory.Special, 90, 100, 15, 0, null),
        attacker: { volatileState: { powder: true } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used かえんほうしゃ but the powder exploded! (25 damage)');
      expect(statuses.get(ATTACKER_ID).currentHp).toBe(75);
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
    });

    it('マジックガードなら、ふんじんのダメージを受けない', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: new Move(1, 'かえんほうしゃ', 'x', FIRE, MoveCategory.Special, 90, 100, 15, 0, null),
        attackerAbility: 'マジックガード',
        attacker: { volatileState: { powder: true } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).currentHp).toBe(100);
    });
  });

  describe('みらいよち（futureMove）', () => {
    it('使うと相手の陣営に futureAttack を置き、ダメージは与えない', async () => {
      // Arrange
      const { execute, statuses, battleRepository } = setupMoveExecutor({
        move: createMove('みらいよち', MoveCategory.Special, 120),
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used みらいよち and foresaw an attack!');
      expect(battleRepository.patchSideConditions).toHaveBeenCalledWith(1, DEFENDER_ID, {
        futureAttack: { turns: 3, moveId: 1, sourceStatusId: ATTACKER_ID },
      });
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
    });
  });

  describe('みちづれ・おんねん', () => {
    it('みちづれの相手を倒すと、使用者もひんしになる', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        damage: 100,
        defender: { volatileState: { destinyBond: true } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).currentHp).toBe(0);
      expect(message).toContain('took its attacker down with it!');
    });

    it('おんねんの相手を倒すと、倒した技の PP が 0 になる', async () => {
      // Arrange
      const { execute, battleRepository } = setupMoveExecutor({
        damage: 100,
        defender: { volatileState: { grudge: true } },
      });
      battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
        new BattlePokemonMove(1, ATTACKER_ID, 1, 9, 10),
      ]);

      // Act
      await execute();

      // Assert
      expect(battleRepository.updateBattlePokemonMove).toHaveBeenLastCalledWith(1, {
        currentPp: 0,
      });
    });
  });

  describe('みがわり', () => {
    it('ダメージはみがわりが受け、本体の HP は減らない', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        defender: { volatileState: { substituteHp: 25 } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
      expect(statuses.get(DEFENDER_ID).volatileState.substituteHp).toBe(15);
      expect(message).toBe('Used ほのおのパンチ and hit the substitute (10 damage)');
    });

    it('みがわりの HP を超えるダメージで、みがわりが消える', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        damage: 30,
        defender: { volatileState: { substituteHp: 25 } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).volatileState.substituteHp).toBeUndefined();
      expect(message).toContain('The substitute broke!');
    });

    it('相手を対象にする変化技は、みがわりに防がれる', async () => {
      // Arrange
      const onUse = jest.fn().mockResolvedValue('fell asleep!');
      const { execute } = setupMoveExecutor({
        move: createMove('さいみんじゅつ', MoveCategory.Status, null),
        moveEffect: { onUse },
        defender: { volatileState: { substituteHp: 25 } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(message).toBe('Used さいみんじゅつ but it failed');
      expect(onUse).not.toHaveBeenCalled();
    });

    it('音技（bypassSubstitute）はみがわりを貫通する', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('ハイパーボイス', MoveCategory.Special, 90),
        defender: { volatileState: { substituteHp: 25 } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
      expect(statuses.get(DEFENDER_ID).volatileState.substituteHp).toBe(25);
    });

    it('すりぬけ（infiltrates）の攻撃は、みがわりを貫通する', async () => {
      // Arrange
      AbilityRegistry.register('テストすりぬけ', { infiltrates: true });
      const { execute, statuses } = setupMoveExecutor({
        attackerAbility: 'テストすりぬけ',
        defender: { volatileState: { substituteHp: 25 } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    });
  });

  describe('くちばしキャノン', () => {
    it('加熱中の相手に接触技を当てると、攻撃側がやけどになる', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        defender: { volatileState: { beakBlast: true } },
      });

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).statusCondition).toBe(StatusCondition.Burn);
      expect(message).toContain('was burned by Beak Blast!');
    });

    it('くちばしキャノンを撃ったら、加熱が終わる', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('くちばしキャノン', MoveCategory.Physical, 100, -3),
        attacker: { volatileState: { beakBlast: true } },
      });

      // Act
      await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.beakBlast).toBeUndefined();
    });
  });
});
