import { MistySurgeEffect } from './misty-surge-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('MistySurgeEffect', () => {
  let effect: MistySurgeEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new MistySurgeEffect();
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
      update: jest.fn().mockResolvedValue(
        new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.MistyTerrain, BattleStatus.Active, null),
      ),
      findById: jest.fn(),
      create: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn(),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
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

  describe('onEntry', () => {
    it('should change field to MistyTerrain when onEntry is called', async () => {
      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        field: Field.MistyTerrain,
      });
    });

    it('should not change field when already MistyTerrain', async () => {
      const contextWithField: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          field: Field.MistyTerrain,
        },
      };
      await effect.onEntry(pokemon, contextWithField);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });

    it('should not change field when battleRepository is not provided', async () => {
      const contextWithoutRepository: BattleContext = {
        ...battleContext,
        battleRepository: undefined,
      };
      await effect.onEntry(pokemon, contextWithoutRepository);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });
  });
});
