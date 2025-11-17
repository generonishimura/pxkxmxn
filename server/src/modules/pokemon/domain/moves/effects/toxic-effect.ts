import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくどく」の特殊効果実装
 *
 * 効果: 必ず相手にもうどくを付与
 */
export class ToxicEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.BadPoison;
  protected readonly chance = 1.0; // 必ず付与
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was badly poisoned!';
}

