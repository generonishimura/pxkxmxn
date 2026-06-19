import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「でんじほう」の特殊効果実装
 *
 * 効果: 必ず相手にまひを付与 (Has a 100% chance to paralyze the target)
 */
export class ZapCannonEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}
