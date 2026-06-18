import { SwarmEffect } from './swarm-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('SwarmEffect', () => {
  let effect: SwarmEffect;

  beforeEach(() => {
    effect = new SwarmEffect();
  });

  const createPokemon = (currentHp: number, maxHp: number = 100): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  it('HP が 1/3 以下かつ むしタイプの技なら 1.5 倍する', () => {
    const pokemon = createPokemon(30, 100);
    const ctx = createCtx('むし');

    expect(effect.modifyDamageDealt(pokemon, 100, ctx)).toBe(150);
  });

  it('HP が 1/3 より上なら修正しない', () => {
    const pokemon = createPokemon(50, 100);
    const ctx = createCtx('むし');

    expect(effect.modifyDamageDealt(pokemon, 100, ctx)).toBeUndefined();
  });

  it('HP が低くても むし以外の技は修正しない', () => {
    const pokemon = createPokemon(30, 100);
    const ctx = createCtx('くさ');

    expect(effect.modifyDamageDealt(pokemon, 100, ctx)).toBeUndefined();
  });

  it('moveTypeName が無いなら修正しない', () => {
    const pokemon = createPokemon(30, 100);
    const ctx = createCtx();

    expect(effect.modifyDamageDealt(pokemon, 100, ctx)).toBeUndefined();
  });

  it('1.5 倍で小数になる値は Math.floor で切り捨て', () => {
    const pokemon = createPokemon(30, 100);
    const ctx = createCtx('むし');

    expect(effect.modifyDamageDealt(pokemon, 99, ctx)).toBe(148); // 99 * 1.5 = 148.5 → 148
  });
});
