import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';

/**
 * マイペース（Own Tempo）特性の効果
 * こんらん無効化
 *
 * 注意: 現在のシステムではこんらん（Confusion）はStatusConditionに含まれていないため、
 * この特性は現時点では効果がありません。
 */
export class OwnTempoEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [] as const;
}
