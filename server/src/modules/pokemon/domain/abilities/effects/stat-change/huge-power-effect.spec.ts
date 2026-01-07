import { HugePowerEffect } from './huge-power-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Weather, Field, BattleStatus, Battle } from '@/modules/battle/domain/entities/battle.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';

describe('HugePowerEffect', () => {
  let effect: HugePowerEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new HugePowerEffect();
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

  describe('modifyDamageDealt', () => {
    it('should double physical damage', () => {
      const damage = 100;
      battleContext.moveCategory = 'Physical';

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(200);
    });

    it('should not modify special damage', () => {
      const damage = 100;
      battleContext.moveCategory = 'Special';

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('should not modify status move damage', () => {
      const damage = 100;
      battleContext.moveCategory = 'Status';

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('should not modify damage when moveCategory is undefined', () => {
      const damage = 100;
      battleContext.moveCategory = undefined;

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBeUndefined();
    });

    it('should floor the result', () => {
      const damage = 99;
      battleContext.moveCategory = 'Physical';

      const result = effect.modifyDamageDealt(pokemon, damage, battleContext);

      expect(result).toBe(198);
    });
  });
});
