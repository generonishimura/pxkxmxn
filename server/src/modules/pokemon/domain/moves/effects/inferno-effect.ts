import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「れんごく」の特殊効果実装
 *
 * 効果: 100%の確率で相手にやけどを付与 (Has a 100% chance to burn the target)
 */
export class InfernoEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
