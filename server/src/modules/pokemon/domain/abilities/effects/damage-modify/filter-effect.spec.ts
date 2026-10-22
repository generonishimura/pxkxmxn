import { FilterEffect } from './filter-effect';
import { PrismArmorEffect } from './prism-armor-effect';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FilterEffect / PrismArmorEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const createCtx = (typeEffectiveness?: number): BattleContext => ({
    battle,
    moveCategory: 'Physical',
    typeEffectiveness,
  });

  describe.each([
    ['フィルター・ハードロック', (): FilterEffect => new FilterEffect()],
    ['プリズムアーマー', (): FilterEffect => new PrismArmorEffect()],
  ])('%s', (_name, createEffect) => {
    it('効果ばつぐんの技のダメージを0.75倍にする', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 100, createCtx(2));

      // Assert
      expect(result).toBe(75);
    });

    it('4倍の技のダメージも0.75倍にする', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 200, createCtx(4));

      // Assert
      expect(result).toBe(150);
    });

    it('4096分率で丸める（101 × 0.75 = 75.75 は 76）', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 101, createCtx(2));

      // Assert
      expect(result).toBe(76);
    });

    it('ちょうど0.5の端数は切り捨てる（102 × 0.75 = 76.5 は 76）', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 102, createCtx(2));

      // Assert
      expect(result).toBe(76);
    });

    it('等倍の技のダメージは変えない', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 100, createCtx(1));

      // Assert
      expect(result).toBe(100);
    });

    it('いまひとつの技のダメージは変えない', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 50, createCtx(0.5));

      // Assert
      expect(result).toBe(50);
    });

    it('タイプ相性が分からない場合はダメージを変えない', () => {
      // Arrange
      const effect = createEffect();

      // Act
      const result = effect.modifyDamage(pokemon, 100, undefined);

      // Assert
      expect(result).toBe(100);
    });
  });

  it('フィルター・ハードロックはかたやぶりで無視される', () => {
    // Arrange
    const effect: IAbilityEffect = new FilterEffect();

    // Act
    const result = effect.unaffectedByMoldBreaker;

    // Assert
    expect(result).toBeFalsy();
  });

  it('プリズムアーマーはかたやぶりで無視されない', () => {
    // Arrange
    const effect = new PrismArmorEffect();

    // Act
    const result = effect.unaffectedByMoldBreaker;

    // Assert
    expect(result).toBe(true);
  });
});
