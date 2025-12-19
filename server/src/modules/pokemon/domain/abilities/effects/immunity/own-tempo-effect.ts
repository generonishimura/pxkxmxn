import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';

/**
 * マイペース（Own-tempo）特性の効果
 * こんらん無効化
 *
 * 注: 現在のシステムではこんらん（Confusion）はStatusConditionに含まれていないため、
 * この特性は現時点では効果がありません。
 * 将来的にこんらんがStatusConditionとして実装された場合に備えて実装しています。
 */
export class OwnTempoEffect extends BaseStatusConditionImmunityEffect {
  // 注: 現在のシステムではこんらんがStatusConditionに含まれていないため、
  // 空の配列として実装しています。
  // 将来的にこんらんが実装された場合は、StatusCondition.Confusionを追加してください。
  protected readonly immuneStatusConditions = [] as const;
}

