import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * 決まったタイプの技の威力を 1.2 倍にする持ち物の基底クラス
 * もくたん（ほのお）、しんぴのしずく（みず）などで使う
 *
 * 補正は4096分率（4915/4096）で、ダメージ計算式に入る前の威力に掛ける
 */
export abstract class BaseTypeBoostItemEffect implements IItemEffect {
  /**
   * 威力を上げる技のタイプ（日本語名）
   */
  protected abstract readonly boostedType: string;

  /**
   * 威力の補正（4096分率。1.2倍 = 4915）
   */
  private static readonly POWER_MODIFIER = 4915;

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveTypeName !== this.boostedType) {
      return undefined;
    }
    return modifyByFixedPoint(power, BaseTypeBoostItemEffect.POWER_MODIFIER);
  }
}
