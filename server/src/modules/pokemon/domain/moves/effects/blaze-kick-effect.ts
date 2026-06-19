import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ブレイズキック」の特殊効果実装
 *
 * 効果: 10%の確率で相手にやけどを付与 (Has a 10% chance to burn the target)
 * 注: 急所率上昇は別処理（ダメージ計算側）で扱う
 */
export class BlazeKickEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
