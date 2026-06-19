import { NoGuardEffect } from './no-guard-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('NoGuardEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const ctx: BattleContext = {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
  };

  let effect: NoGuardEffect;

  beforeEach(() => {
    effect = new NoGuardEffect();
  });

  it('命中率を 100 に上書きする', () => {
    expect(effect.modifyAccuracy(pokemon, 50, ctx)).toBe(100);
    expect(effect.modifyAccuracy(pokemon, 80, ctx)).toBe(100);
    expect(effect.modifyAccuracy(pokemon, 100, ctx)).toBe(100);
  });

  it('元の命中率が 0 でも 100 を返す', () => {
    expect(effect.modifyAccuracy(pokemon, 0, ctx)).toBe(100);
  });

  it('battleContext が無くても 100 を返す', () => {
    expect(effect.modifyAccuracy(pokemon, 50, undefined)).toBe(100);
  });
});
