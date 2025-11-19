import { SandStreamEffect } from './sand-stream-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('SandStreamEffect', () => {
  let effect: SandStreamEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;
  let mockBattleRepository: jest.Mocked<IBattleRepository>;

  beforeEach(() => {
    effect = new SandStreamEffect();
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
        weather: Weather.Sandstorm,
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
    it('should change weather to Sandstorm when onEntry is called', async () => {
      await effect.onEntry(pokemon, battleContext);

      expect(mockBattleRepository.update).toHaveBeenCalledWith(1, {
        weather: Weather.Sandstorm,
      });
    });

    it('should not change weather when already Sandstorm', async () => {
      const contextWithSandstorm: BattleContext = {
        ...battleContext,
        battle: {
          ...battleContext.battle,
          weather: Weather.Sandstorm,
        },
      };
      await effect.onEntry(pokemon, contextWithSandstorm);

      expect(mockBattleRepository.update).not.toHaveBeenCalled();
    });
  });
});

