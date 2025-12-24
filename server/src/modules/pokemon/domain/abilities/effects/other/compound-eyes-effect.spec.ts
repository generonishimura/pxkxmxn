import { CompoundEyesEffect } from './compound-eyes-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

describe('CompoundEyesEffect', () => {
  let effect: CompoundEyesEffect;
  let pokemon: BattlePokemonStatus;
  let battleContext: BattleContext;

  beforeEach(() => {
    effect = new CompoundEyesEffect();
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

  describe('modifyAccuracy', () => {
    it('命中率を1.3倍にする', () => {
      const result = effect.modifyAccuracy(pokemon, 50, battleContext);
      expect(result).toBe(65); // 50 * 1.3 = 65
    });

    it('命中率が100を超える場合は100に制限される', () => {
      const result = effect.modifyAccuracy(pokemon, 80, battleContext);
      expect(result).toBe(100); // 80 * 1.3 = 104 → 100
    });

    it('命中率が0の場合は0のまま', () => {
      const result = effect.modifyAccuracy(pokemon, 0, battleContext);
      expect(result).toBe(0);
    });

    it('命中率が77の場合は100になる', () => {
      const result = effect.modifyAccuracy(pokemon, 77, battleContext);
      expect(result).toBe(100); // 77 * 1.3 = 100.1 → 100
    });
  });
});
