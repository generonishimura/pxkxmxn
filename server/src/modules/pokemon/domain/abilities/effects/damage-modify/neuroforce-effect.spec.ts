import { NeuroforceEffect } from './neuroforce-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('NeuroforceEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const createCtx = (typeEffectiveness?: number): BattleContext => ({
    battle,
    moveCategory: 'Special',
    typeEffectiveness,
  });

  let effect: NeuroforceEffect;

  beforeEach(() => {
    effect = new NeuroforceEffect();
  });

  it('効果ばつぐんの技のダメージを1.25倍にする', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 200, createCtx(2));

    // Assert
    expect(result).toBe(250);
  });

  it('4倍の技のダメージも1.25倍にする', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 400, createCtx(4));

    // Assert
    expect(result).toBe(500);
  });

  it('ちょうど0.5の端数は切り捨てる（102 × 1.25 = 127.5 は 127）', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 102, createCtx(2));

    // Assert
    expect(result).toBe(127);
  });

  it('0.5より大きい端数は切り上げる（103 × 1.25 = 128.75 は 129）', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 103, createCtx(2));

    // Assert
    expect(result).toBe(129);
  });

  it('等倍の技のダメージは変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 100, createCtx(1));

    // Assert
    expect(result).toBe(100);
  });

  it('いまひとつの技のダメージは変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 50, createCtx(0.5));

    // Assert
    expect(result).toBe(50);
  });

  it('タイプ相性が分からない場合はダメージを変えない', () => {
    // Act
    const result = effect.modifyDamageDealt(pokemon, 100, undefined);

    // Assert
    expect(result).toBe(100);
  });
});
