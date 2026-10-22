import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';
import { GooeyEffect } from '../stat-change/gooey-effect';
import { WeakArmorEffect } from '../stat-change/weak-armor-effect';
import { PoisonPointEffect } from '../stat-change/poison-point-effect';
import { FluffyEffect } from '../damage-modify/fluffy-effect';

describe('接触判定（技フラグ）', () => {
  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createContext = (
    moveCategory: 'Physical' | 'Special',
    flags: MoveFlag[],
  ): BattleContext => {
    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(createStatus(1)),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
      patchVolatileState: jest.fn(),
      patchPersistentState: jest.fn(),
      patchSideConditions: jest.fn(),
      patchGlobalFieldState: jest.fn(),
    };
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn().mockResolvedValue(null),
      findByTrainerId: jest.fn(),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository,
      trainedPokemonRepository,
      moveCategory,
      moveFlags: new Set(flags),
    };
  };

  it('接触しない物理技では、ぬめぬめが発動しない', async () => {
    // Arrange
    const context = createContext('Physical', []);

    // Act
    const result = await new GooeyEffect().applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      context,
    );

    // Assert
    expect(result).toBe(false);
  });

  it('くだけるよろいは接触しない物理技でも発動する', async () => {
    // Arrange
    const context = createContext('Physical', []);

    // Act
    const result = await new WeakArmorEffect().applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      context,
    );

    // Assert
    expect(result).toBe(true);
  });

  it('くだけるよろいは接触する特殊技では発動しない', async () => {
    // Arrange
    const context = createContext('Special', ['contact']);

    // Act
    const result = await new WeakArmorEffect().applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      context,
    );

    // Assert
    expect(result).toBe(false);
  });

  it('接触しない物理技では、どくのトゲの判定に進まない', async () => {
    // Arrange
    const context = createContext('Physical', []);

    // Act
    await new PoisonPointEffect().applyContactStatusCondition(
      createStatus(1),
      createStatus(2),
      context,
    );

    // Assert
    expect(context.trainedPokemonRepository?.findById).not.toHaveBeenCalled();
  });

  it('接触しない物理技では、もふもふでダメージが半分にならない', () => {
    // Arrange
    const context = { ...createContext('Physical', []), moveTypeName: 'じめん' };

    // Act
    const result = new FluffyEffect().modifyDamage(createStatus(2), 100, context);

    // Assert
    expect(result).toBe(100);
  });

  it('接触する特殊技では、もふもふでダメージが半分になる', () => {
    // Arrange
    const context = { ...createContext('Special', ['contact']), moveTypeName: 'フェアリー' };

    // Act
    const result = new FluffyEffect().modifyDamage(createStatus(2), 100, context);

    // Assert
    expect(result).toBe(50);
  });

  it('接触するほのお技では、もふもふの2倍と半減が打ち消し合って等倍になる', () => {
    // Arrange
    const context = { ...createContext('Physical', ['contact']), moveTypeName: 'ほのお' };

    // Act
    const result = new FluffyEffect().modifyDamage(createStatus(2), 100, context);

    // Assert
    expect(result).toBe(100);
  });
});
