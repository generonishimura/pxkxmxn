import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「クロスポイズン」の特殊効果実装
 *
 * 効果: 10%の確率で相手にどくを付与 (Has a 10% chance to poison the target)
 * 注: 急所率上昇は別処理（ダメージ計算側）で扱う
 */
export class CrossPoisonEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['どく', 'はがね'];
  protected readonly message = 'was poisoned!';
}
