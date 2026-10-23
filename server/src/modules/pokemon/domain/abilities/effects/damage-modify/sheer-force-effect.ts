import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * ちからずく（Sheer Force）特性の効果
 * 追加効果がある技（battleContext.hasSecondaryEffect）の威力を1.3倍（5325/4096）にし、追加効果をなくす
 *
 * 追加効果をなくす処理は、エンジンが removesSecondaryEffects を見て battleContext.secondaryEffectsRemoved を
 * true にし、rollSecondaryEffect がそれを見て追加効果を出さないことで行う
 */
export class SheerForceEffect implements IAbilityEffect {
  /**
   * 威力の補正（4096分率で1.3倍）
   */
  private static readonly POWER_MODIFIER = 5325;

  readonly removesSecondaryEffects = true;

  /**
   * ダメージ計算式に入る前の威力に掛かる
   * 追加効果がある技の場合、威力を1.3倍にする
   */
  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.hasSecondaryEffect !== true) {
      return undefined;
    }
    return modifyByFixedPoint(power, SheerForceEffect.POWER_MODIFIER);
  }
}
