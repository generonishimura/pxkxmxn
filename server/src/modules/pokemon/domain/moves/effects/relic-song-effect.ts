import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「いにしえのうた」の特殊効果実装
 *
 * 効果: 10%の確率で相手をねむりにする (Has a 10% chance to put the target to sleep)
 */
export class RelicSongEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Sleep;
  protected readonly chance = 0.1;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'fell asleep!';
}
