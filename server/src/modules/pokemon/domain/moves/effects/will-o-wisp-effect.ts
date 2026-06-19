import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「おにび」の特殊効果実装
 *
 * 効果: 必ず相手にやけどを付与 (Burns the target)
 */
export class WillOWispEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
