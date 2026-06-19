import { MarvelScaleEffect } from './marvel-scale-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('MarvelScaleEffect', () => {
  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  let effect: MarvelScaleEffect;

  beforeEach(() => {
    effect = new MarvelScaleEffect();
  });

  it('状態異常時かつ物理技なら 1/1.5 倍に軽減', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.Burn), 150, createCtx('Physical'))).toBe(100);
    expect(effect.modifyDamage(createPokemon(StatusCondition.Paralysis), 150, createCtx('Physical'))).toBe(100);
    expect(effect.modifyDamage(createPokemon(StatusCondition.Poison), 150, createCtx('Physical'))).toBe(100);
  });

  it('状態異常時でも特殊技は軽減しない', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.Burn), 150, createCtx('Special'))).toBe(150);
  });

  it('状態異常無しなら軽減しない', () => {
    expect(effect.modifyDamage(createPokemon(null), 150, createCtx('Physical'))).toBe(150);
  });

  it('状態異常 None なら軽減しない', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.None), 150, createCtx('Physical'))).toBe(150);
  });

  it('moveCategory が無い場合は軽減しない', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.Burn), 150, createCtx())).toBe(150);
  });

  it('battleContext が無い場合は軽減しない', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.Burn), 150, undefined)).toBe(150);
  });

  it('小数になる値は Math.floor で切り捨て', () => {
    expect(effect.modifyDamage(createPokemon(StatusCondition.Burn), 100, createCtx('Physical'))).toBe(66); // 100/1.5 = 66.66 → 66
  });
});
