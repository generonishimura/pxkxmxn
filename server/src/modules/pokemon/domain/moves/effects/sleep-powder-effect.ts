import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ねむりごな」の特殊効果実装
 *
 * 効果: 75%の確率で相手をねむりにする
 */
export class SleepPowderEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Sleep;
  protected readonly chance = 0.75;
  protected readonly immuneTypes = ['くさ'];
  protected readonly message = 'fell asleep!';
}

