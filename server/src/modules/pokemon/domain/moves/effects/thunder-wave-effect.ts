import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「でんじは」の特殊効果実装
 *
 * 効果: 必ず相手にまひを付与 (Paralyzes the target)
 * でんきタイプ（まひの免疫）とじめんタイプ（でんき技の相性が0）には効かない
 */
export class ThunderWaveEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['でんき', 'じめん'];
  protected readonly message = 'was paralyzed!';
}
