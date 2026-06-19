import { FlareBoostEffect } from './flare-boost-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FlareBoostEffect', () => {
  let effect: FlareBoostEffect;

  beforeEach(() => {
    effect = new FlareBoostEffect();
  });

  const createPokemon = (status: StatusCondition | null): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, status);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  it('やけど × 特殊技なら 1.5 倍', () => {
    const pokemon = createPokemon(StatusCondition.Burn);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBe(150);
  });

  it('やけどでも物理技は修正しない', () => {
    const pokemon = createPokemon(StatusCondition.Burn);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Physical'))).toBeUndefined();
  });

  it('やけど以外の状態異常では修正しない', () => {
    const pokemon = createPokemon(StatusCondition.Poison);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBeUndefined();
  });

  it('状態異常無しなら修正しない', () => {
    const pokemon = createPokemon(null);
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('Special'))).toBeUndefined();
  });
});
