import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「せいなるほのお」の特殊効果実装
 *
 * 効果: 50%の確率で相手にやけどを付与 (Has a 50% chance to burn the target)
 * 注: 自分のこおり状態を解除する効果は別処理（バトルフロー）で扱う
 */
export class SacredFireEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.5;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
