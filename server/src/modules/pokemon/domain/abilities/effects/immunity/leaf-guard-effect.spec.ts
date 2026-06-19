import { LeafGuardEffect } from './leaf-guard-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';

describe('LeafGuardEffect', () => {
  const createPokemon = (): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (weather: Weather | null): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, weather, Field.None, BattleStatus.Active, null),
  });

  let effect: LeafGuardEffect;

  beforeEach(() => {
    effect = new LeafGuardEffect();
  });

  it.each([
    ['Burn', StatusCondition.Burn],
    ['Paralysis', StatusCondition.Paralysis],
    ['Poison', StatusCondition.Poison],
    ['BadPoison', StatusCondition.BadPoison],
    ['Sleep', StatusCondition.Sleep],
    ['Freeze', StatusCondition.Freeze],
  ])('晴天で %s を無効化（false 返却）', (_label, status) => {
    expect(effect.canReceiveStatusCondition(createPokemon(), status, createCtx(Weather.Sun))).toBe(
      false,
    );
  });

  it.each([
    ['Flinch', StatusCondition.Flinch],
    ['Confusion', StatusCondition.Confusion],
  ])('晴天でも %s は無効化対象外（undefined 返却）', (_label, status) => {
    expect(
      effect.canReceiveStatusCondition(createPokemon(), status, createCtx(Weather.Sun)),
    ).toBeUndefined();
  });

  it('晴天でない場合は undefined（判定しない）', () => {
    expect(
      effect.canReceiveStatusCondition(createPokemon(), StatusCondition.Burn, createCtx(Weather.Rain)),
    ).toBeUndefined();
    expect(
      effect.canReceiveStatusCondition(createPokemon(), StatusCondition.Burn, createCtx(null)),
    ).toBeUndefined();
  });

  it('battleContext が無い場合は undefined', () => {
    expect(
      effect.canReceiveStatusCondition(createPokemon(), StatusCondition.Burn, undefined),
    ).toBeUndefined();
  });

  it('battleContext.weather（オーバーライド）が優先される', () => {
    const ctx = createCtx(Weather.Rain);
    ctx.weather = Weather.Sun;
    expect(effect.canReceiveStatusCondition(createPokemon(), StatusCondition.Burn, ctx)).toBe(false);
  });
});
