import { BaseWeatherDependentEvasionEffect } from './base-weather-dependent-evasion-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

class TestSandVeil extends BaseWeatherDependentEvasionEffect {
  protected readonly requiredWeather = Weather.Sandstorm;
}

class TestHailEvasion extends BaseWeatherDependentEvasionEffect {
  protected readonly requiredWeather = Weather.Hail;
}

describe('BaseWeatherDependentEvasionEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (weather: Weather | null): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, weather, Field.None, BattleStatus.Active, null),
  });

  it('対象天候のとき 0.2 を返す', () => {
    const effect = new TestSandVeil();
    expect(effect.modifyEvasion(pokemon, 100, createCtx(Weather.Sandstorm))).toBe(0.2);
  });

  it('対象外の天候では undefined', () => {
    const effect = new TestSandVeil();
    expect(effect.modifyEvasion(pokemon, 100, createCtx(Weather.Rain))).toBeUndefined();
  });

  it('天候 null では undefined', () => {
    const effect = new TestSandVeil();
    expect(effect.modifyEvasion(pokemon, 100, createCtx(null))).toBeUndefined();
  });

  it('battleContext が無い場合は undefined', () => {
    const effect = new TestSandVeil();
    expect(effect.modifyEvasion(pokemon, 100, undefined)).toBeUndefined();
  });

  it('Hail 派生クラスはあられで動作', () => {
    const effect = new TestHailEvasion();
    expect(effect.modifyEvasion(pokemon, 100, createCtx(Weather.Hail))).toBe(0.2);
    expect(effect.modifyEvasion(pokemon, 100, createCtx(Weather.Sandstorm))).toBeUndefined();
  });
});
