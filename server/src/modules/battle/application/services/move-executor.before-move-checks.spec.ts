import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  NORMAL,
  createMove,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 技を出す前の判定（BeforeMoveChecker）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('反動で動けないターンは技を出さず、mustRecharge を消す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { mustRecharge: true, lastMoveId: 1 } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Pokemon must recharge');
    expect(statuses.get(ATTACKER_ID).volatileState.mustRecharge).toBeUndefined();
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('ねむっていると技を出せない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { statusCondition: StatusCondition.Sleep },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot act due to sleep');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('ねむっていても、いびきは出せる', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('いびき', MoveCategory.Special, 50),
      attacker: { statusCondition: StatusCondition.Sleep },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('こおりが溶けなければ技を出せない', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'shouldClearFreeze').mockReturnValue(false);
    const { execute, statuses } = setupMoveExecutor({
      attacker: { statusCondition: StatusCondition.Freeze },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot act due to freeze');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('こおりでも、かえんぐるまは溶かして出せる', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'shouldClearFreeze').mockReturnValue(false);
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('かえんぐるま', MoveCategory.Physical, 60),
      attacker: { statusCondition: StatusCondition.Freeze },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toContain('Pokemon thawed out!');
    expect(statuses.get(ATTACKER_ID).statusCondition).toBe(StatusCondition.None);
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
  });

  it('使用者の特性の onBeforeMove がメッセージを返すと、技を出さない（なまけ）', async () => {
    // Arrange
    const truant: IAbilityEffect = { onBeforeMove: () => 'is loafing around!' };
    AbilityRegistry.register('テストなまけ', truant);
    const { execute, statuses } = setupMoveExecutor({ attackerAbility: 'テストなまけ' });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('is loafing around!');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('ひるんで動けなかったとき、使用者の特性の onFlinch を呼ぶ（ふくつのこころ）', async () => {
    // Arrange
    const onFlinch = jest.fn().mockResolvedValue('Speed rose!');
    AbilityRegistry.register('テストふくつ', { onFlinch });
    const { execute } = setupMoveExecutor({
      attackerAbility: 'テストふくつ',
      attacker: { volatileState: { flinched: true } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(onFlinch).toHaveBeenCalledTimes(1);
    expect(message).toBe("Pokemon flinched and couldn't move Speed rose!");
  });

  it('ちょうはつ中は変化技を出せない', async () => {
    // Arrange
    const { execute } = setupMoveExecutor({
      move: createMove('つるぎのまい', MoveCategory.Status, null),
      attacker: { volatileState: { tauntTurns: 2 } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot use つるぎのまい after the taunt');
  });

  it('かなしばりされた技は出せない', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { disable: { moveId: 1, turns: 3 } } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot use ほのおのパンチ because it is disabled');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('相手がふういんを使っていると、相手が覚えている技は出せない', async () => {
    // Arrange
    const { execute, battleRepository } = setupMoveExecutor({
      defender: { volatileState: { imprison: true } },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(5, DEFENDER_ID, 1, 10, 10),
    ]);

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot use ほのおのパンチ because of Imprison');
  });

  it('メロメロの相手には、半分の確率で動けない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.4);
    const { execute, statuses } = setupMoveExecutor({
      attacker: { volatileState: { infatuatedWithStatusId: DEFENDER_ID } },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Pokemon is immobilized by love');
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(100);
  });

  it('まひで動けないときは技を出さない', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'canAct').mockReturnValue(false);
    const { execute } = setupMoveExecutor({
      attacker: { statusCondition: StatusCondition.Paralysis },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Cannot act due to paralysis');
  });

  it('いちゃもん中でも、げきりんの 2 ターン目は出せて、出し続ける状態も残る', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.99);
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('げきりん', MoveCategory.Physical, 120),
      attacker: {
        volatileState: { torment: true, lastMoveId: 1, lockedInMove: { moveId: 1, turns: 2 } },
      },
    });

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used げきりん and dealt 10 damage');
    expect(statuses.get(ATTACKER_ID).volatileState.lockedInMove).toEqual({ moveId: 1, turns: 1 });
  });

  it('いちゃもん中でも、ソーラービームの 2 ターン目は出せる', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      move: createMove('ソーラービーム', MoveCategory.Special, 120),
      attacker: { volatileState: { torment: true, lastMoveId: 1, chargingMoveId: 1 } },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(DEFENDER_ID).currentHp).toBe(90);
    expect(statuses.get(ATTACKER_ID).volatileState.chargingMoveId).toBeUndefined();
  });

  it('選んだ技と違う技をアンコールされていたら、このターンからアンコールされた技を出し、その技の PP を減らす', async () => {
    // Arrange
    const encored = new Move(
      7,
      'はたく',
      'Pound',
      NORMAL,
      MoveCategory.Physical,
      40,
      100,
      35,
      0,
      null,
    );
    const { execute, battleRepository } = setupMoveExecutor({
      moves: [encored],
      attacker: { volatileState: { encore: { moveId: 7, turns: 3 } } },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, ATTACKER_ID, 1, 10, 10),
      new BattlePokemonMove(2, ATTACKER_ID, 7, 35, 35),
    ]);
    battleRepository.findBattlePokemonMoveById.mockResolvedValue(
      new BattlePokemonMove(2, ATTACKER_ID, 7, 35, 35),
    );

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used はたく and dealt 10 damage');
    expect(battleRepository.updateBattlePokemonMove).toHaveBeenCalledWith(2, { currentPp: 34 });
  });

  it('アンコールされた技の PP が 0 なら、アンコールが解けて選んだ技を出す', async () => {
    // Arrange
    const encored = new Move(
      7,
      'はたく',
      'Pound',
      NORMAL,
      MoveCategory.Physical,
      40,
      100,
      35,
      0,
      null,
    );
    const { execute, statuses, battleRepository } = setupMoveExecutor({
      moves: [encored],
      attacker: { volatileState: { encore: { moveId: 7, turns: 3 } } },
    });
    battleRepository.findBattlePokemonMovesByBattlePokemonStatusId.mockResolvedValue([
      new BattlePokemonMove(1, ATTACKER_ID, 1, 10, 10),
      new BattlePokemonMove(2, ATTACKER_ID, 7, 0, 35),
    ]);

    // Act
    const message = await execute();

    // Assert
    expect(message).toBe('Used ほのおのパンチ and dealt 10 damage');
    expect(statuses.get(ATTACKER_ID).volatileState.encore).toBeUndefined();
  });

  it('まひで動けなかったときも、みちづれ・おんねんを消す', async () => {
    // Arrange
    jest.spyOn(StatusConditionHandler, 'canAct').mockReturnValue(false);
    const { execute, statuses } = setupMoveExecutor({
      attacker: {
        statusCondition: StatusCondition.Paralysis,
        volatileState: { destinyBond: true, grudge: true },
      },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState.destinyBond).toBeUndefined();
    expect(statuses.get(ATTACKER_ID).volatileState.grudge).toBeUndefined();
  });

  it('反動で動けないターンも、みちづれ・おんねんを消す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: {
        volatileState: { mustRecharge: true, lastMoveId: 1, destinyBond: true, grudge: true },
      },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState).toEqual({ lastMoveId: 1 });
  });

  it('技を出せなかったときは、ため技と出し続ける技の状態を消す', async () => {
    // Arrange
    const { execute, statuses } = setupMoveExecutor({
      attacker: {
        statusCondition: StatusCondition.Sleep,
        volatileState: {
          chargingMoveId: 1,
          semiInvulnerable: 'air',
          lockedInMove: { moveId: 1, turns: 1 },
          consecutiveMoveCount: 2,
        },
      },
    });

    // Act
    await execute();

    // Assert
    expect(statuses.get(ATTACKER_ID).volatileState).toEqual({});
  });
});
