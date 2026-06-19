import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「らいげき」の特殊効果実装
 *
 * 効果: 20%の確率で相手にまひを付与 (Has a 20% chance to paralyze the target)
 */
export class BoltStrikeEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 0.2;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}
