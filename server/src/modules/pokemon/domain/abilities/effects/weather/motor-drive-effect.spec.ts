import { MotorDriveEffect } from './motor-drive-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('MotorDriveEffect', () => {
  let effect: MotorDriveEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new MotorDriveEffect();
    pokemon = new BattlePokemonStatus(
      1, // id
      1, // battleId
      1, // trainedPokemonId
      1, // trainerId
      true, // isActive
      100, // currentHp
      100, // maxHp
      0, // attackRank
      0, // defenseRank
      0, // specialAttackRank
      0, // specialDefenseRank
      0, // speedRank
      0, // accuracyRank
      0, // evasionRank
      null, // statusCondition
    );

    mockBattleRepository = {
      update: jest.fn(),
      findById: jest.fn(),
      create: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(pokemon),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn(),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    } as jest.Mocked<IBattleRepository>;

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.None, BattleStatus.Active, null),
      battleRepository: mockBattleRepository,
    };
  });

  describe('isImmuneToType', () => {
    it('should return true for Electric type', () => {
      expect(effect.isImmuneToType(pokemon, 'でんき', battleContext)).toBe(true);
    });

    it('should return false for non-Electric type', () => {
      expect(effect.isImmuneToType(pokemon, 'ほのお', battleContext)).toBe(false);
      expect(effect.isImmuneToType(pokemon, 'みず', battleContext)).toBe(false);
    });
  });

  describe('onEntry', () => {
    it('should increase speed rank by 1 when onEntry is called', async () => {
      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        speedRank: 1,
      });
    });

    it('should not exceed maximum speed rank of 6', async () => {
      const pokemonWithMaxSpeed = new BattlePokemonStatus(
        1, // id
        1, // battleId
        1, // trainedPokemonId
        1, // trainerId
        true, // isActive
        100, // currentHp
        100, // maxHp
        0, // attackRank
        0, // defenseRank
        0, // specialAttackRank
        0, // specialDefenseRank
        6, // speedRank
        0, // accuracyRank
        0, // evasionRank
        null, // statusCondition
      );
      await effect.onEntry(pokemonWithMaxSpeed, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        speedRank: 6,
      });
    });

    it('should not go below minimum speed rank of -6', async () => {
      const pokemonWithMinSpeed = new BattlePokemonStatus(
        1, // id
        1, // battleId
        1, // trainedPokemonId
        1, // trainerId
        true, // isActive
        100, // currentHp
        100, // maxHp
        0, // attackRank
        0, // defenseRank
        0, // specialAttackRank
        0, // specialDefenseRank
        -6, // speedRank
        0, // accuracyRank
        0, // evasionRank
        null, // statusCondition
      );
      await effect.onEntry(pokemonWithMinSpeed, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        speedRank: -5,
      });
    });

    it('should not change speed rank when battleRepository is not provided', async () => {
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      await effect.onEntry(pokemon, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
