import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ひっさつまえば」の特殊効果実装
 *
 * 効果: 0.1の確率で相手にひるみを付与

 */
export class HyperFangEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.1;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
