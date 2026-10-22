import { FurCoatEffect } from './fur-coat-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FurCoatEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  let effect: FurCoatEffect;

  beforeEach(() => {
    effect = new FurCoatEffect();
  });

  it('物理技のダメージを半減する', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx('Physical'))).toBe(50);
  });

  it('特殊技のダメージは軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx('Special'))).toBe(100);
  });

  it('moveCategory が無い場合は軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx())).toBe(100);
  });

  it('battleContext が無い場合は軽減しない', () => {
    expect(effect.modifyDamage(pokemon, 100, undefined)).toBe(100);
  });

  it('小数になる値は Math.floor で切り捨て', () => {
    expect(effect.modifyDamage(pokemon, 101, createCtx('Physical'))).toBe(50);
  });
});
