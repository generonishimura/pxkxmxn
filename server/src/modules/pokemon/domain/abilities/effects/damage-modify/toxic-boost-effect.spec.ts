import { ToxicBoostEffect } from './toxic-boost-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('ToxicBoostEffect', () => {
  let effect: ToxicBoostEffect;

  beforeEach(() => {
    effect = new ToxicBoostEffect();
  });

  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  it('どく状態 × 物理技なら 1.5 倍', () => {
    const pokemon = createPokemon(StatusCondition.Poison);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBe(150);
  });

  it('もうどく状態 × 物理技なら 1.5 倍', () => {
    const pokemon = createPokemon(StatusCondition.BadPoison);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBe(150);
  });

  it('物理技でも毒以外の状態異常では修正しない', () => {
    const pokemon = createPokemon(StatusCondition.Burn);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
  });

  it('どく状態でも特殊技は修正しない', () => {
    const pokemon = createPokemon(StatusCondition.Poison);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBeUndefined();
  });

  it('状態異常無しなら修正しない', () => {
    const pokemon = createPokemon(null);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
  });

  it('moveCategory 無しなら修正しない', () => {
    const pokemon = createPokemon(StatusCondition.Poison);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx())).toBeUndefined();
  });
});
