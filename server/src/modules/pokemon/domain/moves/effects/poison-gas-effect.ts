import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくガス」の特殊効果実装
 *
 * 効果: 必ず相手にどくを付与 (Poisons the target)
 */
export class PoisonGasEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';
}
