import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「たつまき」の特殊効果実装
 *
 * 効果: 20%の確率で相手にひるみを付与 (Has a 20% chance to make the target flinch)
 */
export class TwisterEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.2;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
