import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * どくのトゲ（Immunity）特性の効果
 * どく・もうどく無効化
 */
export class ImmunityEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [
    StatusCondition.Poison,
    StatusCondition.BadPoison,
  ] as const;
}
