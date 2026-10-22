import { TransistorEffect } from './transistor-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('TransistorEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  let effect: TransistorEffect;

  beforeEach(() => {
    effect = new TransistorEffect();
  });

  it('でんきタイプの技のダメージを 1.3 倍にする', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('でんき'))).toBe(130);
  });

  it('でんきタイプ以外の技のダメージは変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('みず'))).toBeUndefined();
  });

  it('技のタイプ情報が無い場合は変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx())).toBeUndefined();
  });

  it('battleContext が無い場合は変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, undefined)).toBeUndefined();
  });
});
