import { BaseFieldDependentSpeedEffect } from './base-field-dependent-speed-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

class TestElectricTerrainSpeed extends BaseFieldDependentSpeedEffect {
  protected readonly requiredFields = [Field.ElectricTerrain] as const;
  protected readonly speedMultiplier = 2.0;
}

class TestMistyTerrainSpeed extends BaseFieldDependentSpeedEffect {
  protected readonly requiredFields = [Field.MistyTerrain] as const;
  protected readonly speedMultiplier = 1.5;
}

describe('BaseFieldDependentSpeedEffect', () => {
  const createPokemon = (): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (field: Field | null): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, field, BattleStatus.Active, null),
  });

  it('対象フィールドのとき速度倍率を適用する', () => {
    const effect = new TestElectricTerrainSpeed();
    const pokemon = createPokemon();
    const ctx = createCtx(Field.ElectricTerrain);

    expect(effect.modifySpeed(pokemon, 100, ctx)).toBe(200);
  });

  it('対象外のフィールドでは undefined を返す', () => {
    const effect = new TestElectricTerrainSpeed();
    const pokemon = createPokemon();
    const ctx = createCtx(Field.GrassyTerrain);

    expect(effect.modifySpeed(pokemon, 100, ctx)).toBeUndefined();
  });

  it('フィールド null では undefined を返す', () => {
    const effect = new TestElectricTerrainSpeed();
    const pokemon = createPokemon();
    const ctx = createCtx(null);

    expect(effect.modifySpeed(pokemon, 100, ctx)).toBeUndefined();
  });

  it('battleContext が無い場合は undefined', () => {
    const effect = new TestElectricTerrainSpeed();
    const pokemon = createPokemon();

    expect(effect.modifySpeed(pokemon, 100, undefined)).toBeUndefined();
  });

  it('1.5倍など整数で割り切れない倍率は Math.floor で切り捨て', () => {
    const effect = new TestMistyTerrainSpeed();
    const pokemon = createPokemon();
    const ctx = createCtx(Field.MistyTerrain);

    expect(effect.modifySpeed(pokemon, 99, ctx)).toBe(148); // 99 * 1.5 = 148.5 → 148
  });
});
