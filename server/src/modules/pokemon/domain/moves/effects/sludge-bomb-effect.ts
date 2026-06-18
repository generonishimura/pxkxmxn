import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ヘドロばくだん」の特殊効果実装
 *
 * 効果: 30%の確率で相手にどくを付与 (Has a 30% chance to poison the target)
 */
export class SludgeBombEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';
}
