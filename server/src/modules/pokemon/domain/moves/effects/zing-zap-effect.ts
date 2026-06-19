import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「びりびりちくちく」の特殊効果実装
 *
 * 効果: 0.3の確率で相手にひるみを付与

 */
export class ZingZapEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.3;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'flinched!';
}
