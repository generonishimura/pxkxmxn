import { InnerFocusEffect } from './inner-focus-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('InnerFocusEffect', () => {
  let effect: InnerFocusEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new InnerFocusEffect();
    pokemon = {
      id: 1,
      battleId: 1,
      trainedPokemonId: 1,
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
    battleContext = {} as BattleContext;
  });

  describe('canReceiveStatusCondition', () => {
    it('ひるみ状態異常を無効化する', () => {
      const result = effect.canReceiveStatusCondition(
        pokemon,
        StatusCondition.Flinch,
        battleContext,
      );
      expect(result).toBe(false);
    });

    it('やけど状態異常は判定しない', () => {
      const result = effect.canReceiveStatusCondition(
        pokemon,
        StatusCondition.Burn,
        battleContext,
      );
      expect(result).toBeUndefined();
    });

    it('どく状態異常は判定しない', () => {
      const result = effect.canReceiveStatusCondition(
        pokemon,
        StatusCondition.Poison,
        battleContext,
      );
      expect(result).toBeUndefined();
    });
  });
});
