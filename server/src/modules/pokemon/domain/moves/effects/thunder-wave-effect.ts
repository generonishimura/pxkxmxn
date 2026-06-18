import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「でんじは」の特殊効果実装
 *
 * 効果: 必ず相手にまひを付与 (Paralyzes the target)
 * 注: じめんタイプへの無効化（タイプ相性）はダメージ計算/命中判定側で扱う想定
 */
export class ThunderWaveEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}
