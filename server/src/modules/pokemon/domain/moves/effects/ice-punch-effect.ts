import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「れいとうパンチ」の特殊効果実装
 *
 * 効果: 10%の確率で相手をこおりにする (Has a 10% chance to freeze the target)
 */
export class IcePunchEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Freeze;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['こおり'];
  protected readonly message = 'was frozen solid!';
}
