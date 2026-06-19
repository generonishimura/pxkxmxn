import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ダークホール」の特殊効果実装
 *
 * 効果: 必ず相手をねむり状態にする

 */
export class DarkVoidEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Sleep;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'fell asleep!';
}
