import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「10まんボルト」の特殊効果実装
 *
 * 効果: 10%の確率で相手にまひを付与
 */
export class ThunderboltEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}

