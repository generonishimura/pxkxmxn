import { BigPecksEffect } from './big-pecks-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('BigPecksEffect', () => {
  let effect: BigPecksEffect;
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  beforeEach(() => {
    effect = new BigPecksEffect();
  });

  describe('canReceiveStatChange', () => {
    it('防御の低下（負）は無効化（false 返却）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'defense', -1)).toBe(false);
      expect(effect.canReceiveStatChange(pokemon, 'defense', -2)).toBe(false);
    });

    it('防御の上昇は判定しない（undefined）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'defense', 1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'defense', 2)).toBeUndefined();
    });

    it('防御以外の能力低下は判定しない（undefined）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'attack', -1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'specialAttack', -1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'specialDefense', -1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'speed', -1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'accuracy', -1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'evasion', -1)).toBeUndefined();
    });
  });
});
