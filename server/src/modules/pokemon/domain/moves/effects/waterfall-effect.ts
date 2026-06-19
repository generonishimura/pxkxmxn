import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「たきのぼり」の特殊効果実装
 *
 * 効果: 0.2の確率で相手にひるみを付与

 */
export class WaterfallEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.2;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
