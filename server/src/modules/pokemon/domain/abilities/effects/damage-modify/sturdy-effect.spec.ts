import { SturdyEffect } from './sturdy-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SturdyEffect', () => {
  let effect: SturdyEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new SturdyEffect();
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
    };
  });

  describe('modifyDamage', () => {
    it('should return maxHp - 1 when damage exceeds maxHp at full HP', () => {
      const result = effect.modifyDamage(pokemon, 150, battleContext);
      expect(result).toBe(99); // maxHp - 1 = 100 - 1 = 99
    });

    it('should return maxHp - 1 when damage equals maxHp at full HP', () => {
      const result = effect.modifyDamage(pokemon, 100, battleContext);
      expect(result).toBe(99); // maxHp - 1 = 100 - 1 = 99
    });

    it('should return unchanged damage when damage is less than maxHp at full HP', () => {
      const result = effect.modifyDamage(pokemon, 50, battleContext);
      expect(result).toBe(50);
    });

    it('should return unchanged damage when HP is not full', () => {
      const pokemonWithLowHp = {
        ...pokemon,
        currentHp: 50,
        maxHp: 100,
      } as BattlePokemonStatus;
      const result = effect.modifyDamage(pokemonWithLowHp, 150, battleContext);
      expect(result).toBe(150); // HPが満タンでない場合は修正しない
    });

    it('should return unchanged damage when battleContext is not provided', () => {
      const result = effect.modifyDamage(pokemon, 150, undefined);
      expect(result).toBe(99); // HP満タンなので効果が発動
    });
  });
});
