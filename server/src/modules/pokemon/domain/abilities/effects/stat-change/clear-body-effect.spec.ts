import { ClearBodyEffect } from './clear-body-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('ClearBodyEffect', () => {
  let effect: ClearBodyEffect;
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  beforeEach(() => {
    effect = new ClearBodyEffect();
  });

  describe('canReceiveStatChange', () => {
    it.each([
      'attack',
      'defense',
      'specialAttack',
      'specialDefense',
      'speed',
      'accuracy',
      'evasion',
    ] as const)('%s の低下（負）は無効化（false 返却）', statType => {
      expect(effect.canReceiveStatChange(pokemon, statType, -1)).toBe(false);
      expect(effect.canReceiveStatChange(pokemon, statType, -2)).toBe(false);
    });

    it('能力の上昇は判定しない（undefined）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'attack', 1)).toBeUndefined();
      expect(effect.canReceiveStatChange(pokemon, 'speed', 2)).toBeUndefined();
    });
  });
});
