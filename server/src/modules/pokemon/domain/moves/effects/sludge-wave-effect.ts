import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ヘドロウェーブ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にどくを付与 (Has a 10% chance to poison the target)
 */
export class SludgeWaveEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';
}
