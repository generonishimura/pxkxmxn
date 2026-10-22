import { PunkRockEffect } from './punk-rock-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveFlag } from '../../../moves/move-flags';

describe('PunkRockEffect（パンクロック）', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (flags: readonly MoveFlag[]): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: 'Special',
    moveFlags: new Set<MoveFlag>(flags),
  });

  describe('modifyBasePower（攻撃側）', () => {
    it('音技の威力を1.3倍（5325/4096）にする', () => {
      // Act
      const result = new PunkRockEffect().modifyBasePower(pokemon, 90, createCtx(['sound']));

      // Assert
      expect(result).toBe(117);
    });

    it('4096分率で丸める（威力85 → 111。85 × 1.3 = 110.5 の切り捨てなら110になる）', () => {
      // Act
      const result = new PunkRockEffect().modifyBasePower(pokemon, 85, createCtx(['sound']));

      // Assert
      // floor((85 × 5325 + 2047) / 4096) = 111
      expect(result).toBe(111);
    });

    it('音技でない技の威力は変えない', () => {
      // Act
      const result = new PunkRockEffect().modifyBasePower(pokemon, 90, createCtx(['contact']));

      // Assert
      expect(result).toBeUndefined();
    });

    it('battleContext がなければ威力を変えない', () => {
      // Act
      const result = new PunkRockEffect().modifyBasePower(pokemon, 90, undefined);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  describe('modifyDamage（防御側）', () => {
    it('音技で受けるダメージを半分（2048/4096）にする', () => {
      // Act
      const result = new PunkRockEffect().modifyDamage(pokemon, 100, createCtx(['sound']));

      // Assert
      expect(result).toBe(50);
    });

    it('4096分率で丸める（101 → 50、ちょうど0.5の端数は切り捨て）', () => {
      // Act
      const result = new PunkRockEffect().modifyDamage(pokemon, 101, createCtx(['sound']));

      // Assert
      expect(result).toBe(50);
    });

    it('音技でない技のダメージは変えない', () => {
      // Act
      const result = new PunkRockEffect().modifyDamage(pokemon, 100, createCtx([]));

      // Assert
      expect(result).toBe(100);
    });

    it('battleContext がなければダメージを変えない', () => {
      // Act
      const result = new PunkRockEffect().modifyDamage(pokemon, 100, undefined);

      // Assert
      expect(result).toBe(100);
    });
  });
});
