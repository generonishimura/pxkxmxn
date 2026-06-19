import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「かえんぐるま」の特殊効果実装
 *
 * 効果: 10%の確率で相手にやけどを付与 (Has a 10% chance to burn the target)
 * 注: 自分のこおり状態を解除する効果は別処理（バトルフロー）で扱う
 */
export class FlameWheelEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
