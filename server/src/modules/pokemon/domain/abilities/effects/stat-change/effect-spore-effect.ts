import { BaseContactStatusConditionEffect } from '../base/base-contact-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ほうし（Effect Spore）特性の効果
 * 接触技を受けたとき、30%の確率で相手をどく・まひ・ねむりのいずれかにする
 * （どく 9%、まひ 10%、ねむり 11%）。くさタイプの相手には効かない。
 * 選ばれた状態異常にならないタイプ（どく: どく・はがね、まひ: でんき）の相手にも効かない。
 * 注: 接触技の判定は物理技で近似している。ぼうじん・ぼうじんゴーグルによる無効化は扱わない。
 */
export class EffectSporeEffect extends BaseContactStatusConditionEffect {
  /**
   * 抽選の既定値（どく）。実際に付与する状態異常は selectStatusCondition で決める
   */
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['くさ'] as const;

  /**
   * 状態異常ごとの免疫タイプ。くさタイプはすべて無効
   */
  protected immuneTypesFor(statusCondition: StatusCondition): readonly string[] {
    switch (statusCondition) {
      case StatusCondition.Poison:
        return ['くさ', 'どく', 'はがね'];
      case StatusCondition.Paralysis:
        return ['くさ', 'でんき'];
      default:
        return this.immuneTypes;
    }
  }

  /**
   * 乱数1回で、付与する状態異常を決める
   * [0, 0.09): どく、[0.09, 0.19): まひ、[0.19, 0.3): ねむり、それ以外: なし
   */
  protected selectStatusCondition(): StatusCondition | null {
    const roll = Math.random();
    if (roll >= this.chance) {
      return null;
    }
    if (roll < 0.09) {
      return StatusCondition.Poison;
    }
    if (roll < 0.19) {
      return StatusCondition.Paralysis;
    }
    return StatusCondition.Sleep;
  }
}
