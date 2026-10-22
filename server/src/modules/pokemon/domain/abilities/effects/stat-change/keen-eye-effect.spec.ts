import { KeenEyeEffect } from './keen-eye-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('KeenEyeEffect', () => {
  let effect: KeenEyeEffect;
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  beforeEach(() => {
    effect = new KeenEyeEffect();
  });

  describe('canReceiveStatChange', () => {
    it('命中率の低下（負）は無効化（false 返却）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'accuracy', -1)).toBe(false);
      expect(effect.canReceiveStatChange(pokemon, 'accuracy', -2)).toBe(false);
    });

    it('命中率の上昇は判定しない（undefined）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'accuracy', 1)).toBeUndefined();
    });

    it.each(['attack', 'defense', 'specialAttack', 'specialDefense', 'speed', 'evasion'] as const)(
      '命中率以外（%s）の低下は判定しない（undefined）',
      statType => {
        expect(effect.canReceiveStatChange(pokemon, statType, -1)).toBeUndefined();
      },
    );
  });
});
