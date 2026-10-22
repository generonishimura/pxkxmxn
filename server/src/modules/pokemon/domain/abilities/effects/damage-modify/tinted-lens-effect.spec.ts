import { TintedLensEffect } from './tinted-lens-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('TintedLensEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const createCtx = (typeEffectiveness?: number): BattleContext => ({
    battle,
    moveCategory: 'Special',
    typeEffectiveness,
  });

  let effect: TintedLensEffect;

  beforeEach(() => {
    effect = new TintedLensEffect();
  });

  it('いまひとつの技のダメージを2倍にする', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 50, createCtx(0.5));

    // Assert
    expect(result).toBe(100);
  });

  it('1/4の技のダメージも2倍にする', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 25, createCtx(0.25));

    // Assert
    expect(result).toBe(50);
  });

  it('等倍の技のダメージは変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 100, createCtx(1));

    // Assert
    expect(result).toBe(100);
  });

  it('効果ばつぐんの技のダメージは変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 200, createCtx(2));

    // Assert
    expect(result).toBe(200);
  });

  it('効果がない技のダメージは変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 0, createCtx(0));

    // Assert
    expect(result).toBe(0);
  });

  it('タイプ相性が分からない場合はダメージを変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 100, undefined);

    // Assert
    expect(result).toBe(100);
  });
});
