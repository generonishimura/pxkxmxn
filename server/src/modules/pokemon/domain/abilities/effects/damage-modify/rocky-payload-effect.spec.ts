import { RockyPayloadEffect } from './rocky-payload-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('RockyPayloadEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  let effect: RockyPayloadEffect;

  beforeEach(() => {
    effect = new RockyPayloadEffect();
  });

  it('いわタイプの技のダメージを 1.5 倍にする', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('いわ'))).toBe(150);
  });

  it('いわタイプ以外の技のダメージは変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx('じめん'))).toBeUndefined();
  });

  it('技のタイプ情報が無い場合は変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, createCtx())).toBeUndefined();
  });

  it('battleContext が無い場合は変更しない', () => {
    expect(effect.modifyDamageDealt(pokemon, 100, undefined)).toBeUndefined();
  });
});
