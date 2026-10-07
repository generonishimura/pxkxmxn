import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { UproarEffect } from '@/modules/pokemon/domain/moves/effects/uproar-effect';
import { GeomancyEffect } from '@/modules/pokemon/domain/moves/effects/geomancy-effect';
import { BeakBlastEffect } from '@/modules/pokemon/domain/moves/effects/beak-blast-effect';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  ATTACKER_ID,
  DEFENDER_ID,
  createMove,
  setupMoveExecutor,
} from './__tests__/move-executor-test-setup';

describe('MoveExecutorService - 何ターンかにわたる技（さわぐ・ジオコントロール・くちばしキャノン）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('さわぐ', () => {
    it('当てると残り 2 ターン出し続け、ねむっている相手を起こす', async () => {
      // Arrange
      const { execute, statuses, battleRepository } = setupMoveExecutor({
        move: createMove('さわぐ', MoveCategory.Special, 90),
        moveEffect: new UproarEffect(),
        defender: { statusCondition: StatusCondition.Sleep },
      });
      battleRepository.findBattlePokemonStatusByBattleId.mockImplementation(() =>
        Promise.resolve([...statuses.values()]),
      );

      // Act
      const message = await execute();

      // Assert
      expect(statuses.get(ATTACKER_ID).volatileState.lockedInMove).toEqual({
        moveId: 1,
        turns: 2,
      });
      expect(statuses.get(ATTACKER_ID).volatileState.uproar).toBe(true);
      expect(statuses.get(DEFENDER_ID).statusCondition).toBe(StatusCondition.None);
      expect(message).toContain('The uproar woke up the sleeping Pokemon!');
    });
  });

  describe('ジオコントロール', () => {
    it('1 ターン目はためるだけで、2 ターン目に特攻・特防・素早さが 2 段階ずつ上がる', async () => {
      // Arrange
      const { execute, statuses } = setupMoveExecutor({
        move: createMove('ジオコントロール', MoveCategory.Status, null),
        moveEffect: new GeomancyEffect(),
      });

      // Act
      const chargeMessage = await execute();
      const rankAfterCharge = statuses.get(ATTACKER_ID).specialAttackRank;
      await execute();

      // Assert
      expect(chargeMessage).toContain('Used ジオコントロール and began charging');
      expect(rankAfterCharge).toBe(0);
      const attacker = statuses.get(ATTACKER_ID);
      expect([attacker.specialAttackRank, attacker.specialDefenseRank, attacker.speedRank]).toEqual(
        [2, 2, 2],
      );
      expect(attacker.volatileState.chargingMoveId).toBeUndefined();
    });
  });

  describe('くちばしキャノン', () => {
    it('ターンの初めに加熱し、くちばしキャノンを撃ったら加熱が終わる', async () => {
      // Arrange
      const { execute, service, battle, statuses } = setupMoveExecutor({
        move: createMove('くちばしキャノン', MoveCategory.Physical, 100, -3),
        moveEffect: new BeakBlastEffect(),
      });

      // Act
      const turnStartMessage = await service.runTurnStartHook(
        battle,
        1,
        statuses.get(ATTACKER_ID),
        statuses.get(DEFENDER_ID),
      );
      const heated = statuses.get(ATTACKER_ID).volatileState.beakBlast;
      await execute();

      // Assert
      expect(turnStartMessage).toBe('started heating up its beak!');
      expect(heated).toBe(true);
      expect(statuses.get(ATTACKER_ID).volatileState.beakBlast).toBeUndefined();
    });
  });
});
