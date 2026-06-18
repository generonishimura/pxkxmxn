import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「じんつうりき」の特殊効果実装
 *
 * 効果: 10%の確率で相手にひるみを付与 (Has a 10% chance to make the target flinch)
 */
export class ExtrasensoryEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.1;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
