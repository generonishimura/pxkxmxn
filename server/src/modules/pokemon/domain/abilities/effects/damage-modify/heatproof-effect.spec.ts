import { HeatproofEffect } from './heatproof-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('HeatproofEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  let effect: HeatproofEffect;

  beforeEach(() => {
    effect = new HeatproofEffect();
  });

  it('ほのおタイプの技ダメージを半減する', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx('ほのお'))).toBe(50);
  });

  it('ほのお以外のタイプは修正しない', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx('みず'))).toBe(100);
    expect(effect.modifyDamage(pokemon, 100, createCtx('こおり'))).toBe(100);
  });

  it('moveTypeName が無い場合は修正しない', () => {
    expect(effect.modifyDamage(pokemon, 100, createCtx())).toBe(100);
  });

  it('小数になる値は Math.floor で切り捨て', () => {
    expect(effect.modifyDamage(pokemon, 99, createCtx('ほのお'))).toBe(49); // 99 * 0.5 = 49.5 → 49
  });
});
