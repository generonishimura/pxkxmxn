import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { MeFirstEffect } from '@/modules/pokemon/domain/moves/effects/me-first-effect';
import { CopycatEffect } from '@/modules/pokemon/domain/moves/effects/copycat-effect';
import { InstructEffect } from '@/modules/pokemon/domain/moves/effects/instruct-effect';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
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
});
