import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくどくのキバ」の特殊効果実装
 *
 * 効果: 50%の確率で相手にもうどくを付与 (Has a 50% chance to badly poison the target)
 */
export class PoisonFangEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.BadPoison;
  protected readonly chance = 0.5;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was badly poisoned!';
}
