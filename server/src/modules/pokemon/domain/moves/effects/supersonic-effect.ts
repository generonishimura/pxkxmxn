import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ちょうおんぱ」の特殊効果実装
 *
 * 効果: 必ず相手をこんらんにする (Confuses the target)
 */
export class SupersonicEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Confusion;
  protected readonly chance = 1.0;
  protected readonly immuneTypes: string[] = [];
  protected readonly message = 'became confused!';
}
