import { DrizzleEffect } from './drizzle-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('DrizzleEffect', () => {
  let effect: DrizzleEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new DrizzleEffect();
    pokemon = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
      trainerId: 1,
      isActive: true,
      currentHp: 100,
      maxHp: 100,
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
      statusCondition: null,
    } as BattlePokemonStatus;

    mockBattleRepository = {
      update: jest.fn().mockResolvedValue({
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: Weather.Rain,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      }),
    } as any;

    battleContext = {
      battle: {
        id: 1,
        trainer1Id: 1,
        trainer2Id: 2,
        team1Id: 1,
        team2Id: 2,
        turn: 1,
        weather: Weather.None,
        field: null,
        status: BattleStatus.Active,
        winnerTrainerId: null,
      },
      battleRepository: mockBattleRepository,
    };
  });

  describe('onEntry', () => {
    it('should change weather to Rain when onEntry is called', async () => {
      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        weather: Weather.Rain,
      });
    });

    it('should not change weather when already Rain', async () => {
      const contextWithRain: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Rain,
        },
      };
      await effect.onEntry(pokemon, contextWithRain);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });
  });
});

