import { PurifyingSaltEffect } from './purifying-salt-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

describe('PurifyingSaltEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  let effect: PurifyingSaltEffect;

  beforeEach(() => {
    effect = new PurifyingSaltEffect();
  });

  describe('状態異常の無効化', () => {
    it.each([
      StatusCondition.Burn,
      StatusCondition.Freeze,
      StatusCondition.Paralysis,
      StatusCondition.Poison,
      StatusCondition.BadPoison,
      StatusCondition.Sleep,
    ])('%s を受けない', statusCondition => {
      expect(effect.canReceiveStatusCondition(pokemon, statusCondition, createCtx())).toBe(false);
    });

    it.each([StatusCondition.Confusion, StatusCondition.Flinch])(
      '%s は無効化しない',
      statusCondition => {
        expect(effect.canReceiveStatusCondition(pokemon, statusCondition, createCtx())).toBe(true);
      },
    );
  });

  describe('ゴーストタイプの技のダメージ軽減', () => {
    it('ゴーストタイプの技で受けるダメージを半減する', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('ゴースト'))).toBe(50);
    });

    it('ゴースト以外のタイプの技で受けるダメージは変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx('あく'))).toBe(100);
    });

    it('技のタイプ情報が無い場合はダメージを変えない', () => {
      expect(effect.modifyDamage(pokemon, 100, createCtx())).toBe(100);
    });
  });
});
