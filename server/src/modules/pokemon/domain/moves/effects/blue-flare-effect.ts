import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「あおいほのお」の特殊効果実装
 *
 * 効果: 20%の確率で相手にやけどを付与 (Has a 20% chance to burn the target)
 */
export class BlueFlareEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.2;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
