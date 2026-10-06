import { HyperCutterEffect } from './hyper-cutter-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

describe('HyperCutterEffect', () => {
  let effect: HyperCutterEffect;
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  beforeEach(() => {
    effect = new HyperCutterEffect();
  });

  describe('canReceiveStatChange', () => {
    it('攻撃の低下（負）は無効化（false 返却）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'attack', -1)).toBe(false);
      expect(effect.canReceiveStatChange(pokemon, 'attack', -2)).toBe(false);
    });

    it('攻撃の上昇は判定しない（undefined）', () => {
      expect(effect.canReceiveStatChange(pokemon, 'attack', 1)).toBeUndefined();
    });

    it.each([
      'defense',
      'specialAttack',
      'specialDefense',
      'speed',
      'accuracy',
      'evasion',
    ] as const)('攻撃以外（%s）の低下は判定しない（undefined）', statType => {
      expect(effect.canReceiveStatChange(pokemon, statType, -1)).toBeUndefined();
    });
  });
});
