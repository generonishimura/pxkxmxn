import { CompetitiveEffect } from './competitive-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('CompetitiveEffect', () => {
  let effect: CompetitiveEffect;
  let pokemon: BattlePokemonStatus;
  let opponentPokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new CompetitiveEffect();
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

    opponentPokemon = new BattlePokemonStatus(
      2, // id
      1, // battleId
      2, // trainedPokemonId
      2, // trainerId
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

  describe('onTurnEnd', () => {
    it('should increase special attack rank by 2 when opponent has stat decrease', async () => {
      const opponentWithDecrease = new BattlePokemonStatus(
        2, 1, 2, 2, true, 100, 100, -1, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentWithDecrease);
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemon);

      await effect.onTurnEnd(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 2,
      });
    });

    it('should not increase special attack rank when opponent has no stat decrease', async () => {
      const opponentWithoutDecrease = new BattlePokemonStatus(
        2, 1, 2, 2, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentWithoutDecrease);

      await effect.onTurnEnd(pokemon, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should not increase special attack rank when battleRepository is undefined', async () => {
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };

      await effect.onTurnEnd(pokemon, contextWithoutRepository);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });

    it('should cap special attack rank at 6', async () => {
      const pokemonWithHighRank = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 5, 0, 0, 0, 0, null,
      );
      const opponentWithDecrease = new BattlePokemonStatus(
        2, 1, 2, 2, true, 100, 100, -1, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentWithDecrease);
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonWithHighRank);

      await effect.onTurnEnd(pokemonWithHighRank, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
        specialAttackRank: 6,
      });
    });

    it('should not update when rank does not change', async () => {
      const pokemonAtMax = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 6, 0, 0, 0, 0, null,
      );
      const opponentWithDecrease = new BattlePokemonStatus(
        2, 1, 2, 2, true, 100, 100, -1, 0, 0, 0, 0, 0, 0, null,
      );
      mockBattleRepository.findActivePokemonByBattleIdAndTrainerId.mockResolvedValue(opponentWithDecrease);
      mockBattleRepository.findBattlePokemonStatusById.mockResolvedValue(pokemonAtMax);

      await effect.onTurnEnd(pokemonAtMax, battleContext);

      expect(mockBattleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
