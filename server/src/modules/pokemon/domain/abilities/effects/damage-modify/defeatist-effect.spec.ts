import { DefeatistEffect } from './defeatist-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('DefeatistEffect', () => {
  const createPokemon = (currentHp: number, maxHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, maxHp, 0, 0, 0, 0, 0, 0, 0, null);

  const ctx: BattleContext = {
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
  };

  let effect: DefeatistEffect;

  beforeEach(() => {
    effect = new DefeatistEffect();
  });

  it('HP がちょうど半分のとき与えるダメージを半減する', () => {
    expect(effect.modifyDamageDealt(createPokemon(50, 100), 100, ctx)).toBe(50);
  });

  it('HP が半分未満のとき与えるダメージを半減する', () => {
    expect(effect.modifyDamageDealt(createPokemon(10, 100), 101, ctx)).toBe(50);
  });

  it('HP が半分より多いときはダメージを変更しない', () => {
    expect(effect.modifyDamageDealt(createPokemon(51, 100), 100, ctx)).toBeUndefined();
  });
});
