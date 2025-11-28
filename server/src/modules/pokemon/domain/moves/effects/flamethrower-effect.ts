import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「かえんほうしゃ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にやけどを付与 (10% chance to burn the target)
 */
export class FlamethrowerEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ["ほのお"];
  protected readonly message = 'was burned!';
}
