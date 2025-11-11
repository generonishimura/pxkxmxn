import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「こおりのつぶて」の特殊効果実装
 *
 * 効果: 10%の確率で相手をこおりにする
 */
export class IceBeamEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Freeze;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['こおり'];
  protected readonly message = 'was frozen solid!';
}

