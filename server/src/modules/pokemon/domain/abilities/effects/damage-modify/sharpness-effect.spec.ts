import { SharpnessEffect } from './sharpness-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';

describe('SharpnessEffect（きれあじ）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (flags: readonly MoveFlag[]): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: 'Physical',
    moveFlags: new Set<MoveFlag>(flags),
  });

  describe('modifyBasePower', () => {
    it('切る技の威力を1.5倍（6144/4096）にする', () => {
      // Act
      const result = new SharpnessEffect().modifyBasePower(
        pokemon,
        70,
        createCtx(['contact', 'slicing']),
      );

      // Assert
      expect(result).toBe(105);
    });

    it('4096分率で丸める（威力55 → 82、ちょうど0.5の端数は切り捨て）', () => {
      // Act
      const result = new SharpnessEffect().modifyBasePower(pokemon, 55, createCtx(['slicing']));

      // Assert
      expect(result).toBe(82);
    });

    it('切る技でない技の威力は変えない', () => {
      // Act
      const result = new SharpnessEffect().modifyBasePower(pokemon, 70, createCtx(['contact']));

      // Assert
      expect(result).toBeUndefined();
    });

    it('battleContext がなければ威力を変えない', () => {
      // Act
      const result = new SharpnessEffect().modifyBasePower(pokemon, 70, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  it('ダメージ段階の補正（modifyDamageDealt）は持たない', () => {
    // Act
    const effect = new SharpnessEffect();

    // Assert
    expect('modifyDamageDealt' in effect).toBe(false);
  });
});
