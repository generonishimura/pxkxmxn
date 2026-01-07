import { QuickFeetEffect } from './quick-feet-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('QuickFeetEffect', () => {
  let effect: QuickFeetEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new QuickFeetEffect();
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

    battleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.None, BattleStatus.Active, null),
    };
  });

  describe('modifySpeed', () => {
    it('should multiply speed by 1.5 when status condition is present', () => {
      const pokemonWithBurn = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, StatusCondition.Burn,
      );
      const speed = 100;

      const result = effect.modifySpeed(pokemonWithBurn, speed, battleContext);

      expect(result).toBe(150);
    });

    it('should multiply speed by 1.5 when paralyzed', () => {
      const pokemonWithParalysis = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, StatusCondition.Paralysis,
      );
      const speed = 100;

      const result = effect.modifySpeed(pokemonWithParalysis, speed, battleContext);

      expect(result).toBe(150);
    });

    it('should multiply speed by 1.5 when poisoned', () => {
      const pokemonWithPoison = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, StatusCondition.Poison,
      );
      const speed = 100;

      const result = effect.modifySpeed(pokemonWithPoison, speed, battleContext);

      expect(result).toBe(150);
    });

    it('should not modify speed when no status condition', () => {
      const pokemonWithoutStatus = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null,
      );
      const speed = 100;

      const result = effect.modifySpeed(pokemonWithoutStatus, speed, battleContext);

      expect(result).toBeUndefined();
    });

    it('should not modify speed when status condition is None', () => {
      const pokemonWithNone = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, StatusCondition.None,
      );
      const speed = 100;

      const result = effect.modifySpeed(pokemonWithNone, speed, battleContext);

      expect(result).toBeUndefined();
    });

    it('should floor the result', () => {
      const pokemonWithBurn = new BattlePokemonStatus(
        1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, StatusCondition.Burn,
      );
      const speed = 99;

      const result = effect.modifySpeed(pokemonWithBurn, speed, battleContext);

      expect(result).toBe(148);
    });
  });
});
