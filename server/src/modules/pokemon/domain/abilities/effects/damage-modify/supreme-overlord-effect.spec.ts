import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, BattleStatus, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { BattleContext } from '../../battle-context.interface';
import { AbilityRegistry } from '../../ability-registry';
import { SupremeOverlordEffect } from './supreme-overlord-effect';

describe('SupremeOverlordEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, Weather.None, null, BattleStatus.Active, null);
  const contextWith = (count: number | undefined): BattleContext => ({
    battle,
    attackerFaintedAllyCount: count,
  });

  describe('modifyBasePower', () => {
    it.each([
      [1, 4506, 110],
      [2, 4915, 120],
      [3, 5325, 130],
      [4, 5734, 140],
      [5, 6144, 150],
    ])(
      'ひんしの仲間が %i 匹なら威力に %i/4096 を掛ける（威力100 → %i）',
      (count, modifier, expected) => {
        // Act
        const result = new SupremeOverlordEffect().modifyBasePower(
          pokemon,
          100,
          contextWith(count),
        );
        // 威力 4096 に掛けると、掛けた 4096 分率の値そのものになる
        const raw = new SupremeOverlordEffect().modifyBasePower(pokemon, 4096, contextWith(count));

        // Assert
        expect(result).toBe(expected);
        expect(raw).toBe(modifier);
      },
    );

    it('ひんしの仲間が 6 匹以上でも 5 匹として扱う', () => {
      // Act
      const result = new SupremeOverlordEffect().modifyBasePower(pokemon, 100, contextWith(7));

      // Assert
      expect(result).toBe(150);
    });

    it('4096分率で丸める（威力80・1匹 → 88.0078 は 88）', () => {
      // Act
      const result = new SupremeOverlordEffect().modifyBasePower(pokemon, 80, contextWith(1));

      // Assert
      expect(result).toBe(88);
    });

    it('ちょうど .5 になったら切り捨てる（威力25・5匹 → 37.5 は 37）', () => {
      // Act
      const result = new SupremeOverlordEffect().modifyBasePower(pokemon, 25, contextWith(5));

      // Assert
      expect(result).toBe(37);
    });

    it('ひんしの仲間がいなければ補正しない', () => {
      // Act
      const result = new SupremeOverlordEffect().modifyBasePower(pokemon, 100, contextWith(0));

      // Assert
      expect(result).toBeUndefined();
    });

    it('数がコンテキストにないときは補正しない', () => {
      // Act
      const withoutCount = new SupremeOverlordEffect().modifyBasePower(
        pokemon,
        100,
        contextWith(undefined),
      );
      const withoutContext = new SupremeOverlordEffect().modifyBasePower(pokemon, 100);

      // Assert
      expect(withoutCount).toBeUndefined();
      expect(withoutContext).toBeUndefined();
    });
  });

  it('そうだいしょう がレジストリに登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('そうだいしょう');

    // Assert
    expect(effect).toBeInstanceOf(SupremeOverlordEffect);
  });
});
