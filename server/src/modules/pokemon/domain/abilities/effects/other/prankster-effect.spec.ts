import { PranksterEffect } from './prankster-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('PranksterEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (cat?: 'Physical' | 'Special' | 'Status'): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveCategory: cat,
  });

  let effect: PranksterEffect;

  beforeEach(() => {
    effect = new PranksterEffect();
  });

  it('変化技の優先度を +1 する', () => {
    expect(effect.modifyPriority(pokemon, 0, createCtx('Status'))).toBe(1);
    expect(effect.modifyPriority(pokemon, 5, createCtx('Status'))).toBe(6);
    expect(effect.modifyPriority(pokemon, -1, createCtx('Status'))).toBe(0);
  });

  it('物理・特殊技は修正しない（undefined）', () => {
    expect(effect.modifyPriority(pokemon, 0, createCtx('Physical'))).toBeUndefined();
    expect(effect.modifyPriority(pokemon, 0, createCtx('Special'))).toBeUndefined();
  });

  it('moveCategory が無い場合は修正しない', () => {
    expect(effect.modifyPriority(pokemon, 0, createCtx())).toBeUndefined();
  });

  it('battleContext が無い場合は修正しない', () => {
    expect(effect.modifyPriority(pokemon, 0, undefined)).toBeUndefined();
  });
});
