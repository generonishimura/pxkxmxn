import { BerserkEffect } from './berserk-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('BerserkEffect', () => {
  let effect: BerserkEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new BerserkEffect();
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

  describe('onAfterTakingDamage', () => {
    it('should increase special attack rank by 1 when HP is at half or below', async () => {
      const pokemonAtHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonAtHalf);

      await effect.onAfterTakingDamage(pokemonAtHalf, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 1,
      });
    });

    it('should increase special attack rank by 1 when HP is below half', async () => {
      const pokemonBelowHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 49, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonBelowHalf);

      await effect.onAfterTakingDamage(pokemonBelowHalf, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 1,
      });
    });

    it('should not increase special attack rank when HP is above half', async () => {
      const pokemonAboveHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 51, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonAboveHalf);

      await effect.onAfterTakingDamage(pokemonAboveHalf, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should not modify when battleRepository is undefined', async () => {
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      const pokemonAtHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 50, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );

      await effect.onAfterTakingDamage(pokemonAtHalf, 0, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should cap special attack rank at 6', async () => {
      const pokemonAtHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 50, 100, 0, 0, 5, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonAtHalf);

      await effect.onAfterTakingDamage(pokemonAtHalf, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 6,
      });
    });

    it('should not update when rank does not change', async () => {
      const pokemonAtHalf = new BattlePokemonStatus(
        1, 1, 1, 1, true, 50, 100, 0, 0, 6, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonAtHalf);

      await effect.onAfterTakingDamage(pokemonAtHalf, 0, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
