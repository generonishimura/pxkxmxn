import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「したでなめる」の特殊効果実装
 *
 * 効果: 30%の確率で相手にまひを付与 (Has a 30% chance to paralyze the target)
 */
export class LickEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}
