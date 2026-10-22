import { BaseContactStatChangeEffect } from '../base/base-contact-stat-change-effect';

/**
 * くだけるよろい（Weak Armor）特性の効果
 * 物理技を受けたとき、自分の防御が1段階下がり、素早さが2段階上がる（第7世代以降の仕様）
 * 注: 状態異常付与用のフック（applyContactStatusCondition）を流用している。接触しない物理技でも発動する。
 */
export class WeakArmorEffect extends BaseContactStatChangeEffect {
  protected readonly target = 'defender' as const;
  protected readonly trigger = 'physical' as const;
  protected readonly statChanges = [
    { statType: 'defense', rankChange: -1 },
    { statType: 'speed', rankChange: 2 },
  ] as const;
}
