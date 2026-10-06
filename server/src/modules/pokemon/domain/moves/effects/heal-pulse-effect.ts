import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';
import { BattleContext } from '../../abilities/battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * いやしのはどう（Heal Pulse）技の効果
 *
 * 効果: 技の対象（シングルバトルでは相手）の HP を最大 HP の 1/2 回復する
 *
 * - 使ったポケモンの特性がメガランチャーなら、最大 HP の 3/4（3072/4096）を回復する
 * - 対象の HP が満タンの場合は失敗
 */
export class HealPulseEffect extends BaseHealEffect {
  /**
   * 回復量を 3/4 にする特性の名前
   */
  private static readonly MEGA_LAUNCHER_ABILITY_NAME = 'メガランチャー';

  /**
   * メガランチャーのときの回復割合（4096分率で 3/4）
   */
  private static readonly MEGA_LAUNCHER_HEAL_MODIFIER = 3072;

  protected readonly healTarget: HealTarget = 'target';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 2 };

  protected computeHealAmount(maxHp: number, battleContext: BattleContext): number {
    if (battleContext.attackerAbilityName === HealPulseEffect.MEGA_LAUNCHER_ABILITY_NAME) {
      return modifyByFixedPoint(maxHp, HealPulseEffect.MEGA_LAUNCHER_HEAL_MODIFIER);
    }
    return super.computeHealAmount(maxHp, battleContext);
  }
}
