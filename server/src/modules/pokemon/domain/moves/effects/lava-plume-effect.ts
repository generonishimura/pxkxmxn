import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ふんえん」の特殊効果実装
 *
 * 効果: 30%の確率で相手にやけどを付与 (Has a 30% chance to burn the target)
 */
export class LavaPlumeEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
