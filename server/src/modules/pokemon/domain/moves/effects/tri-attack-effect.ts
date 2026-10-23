import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import {
  BaseRandomStatusConditionEffect,
  RandomStatusConditionCandidate,
} from './base/base-random-status-condition-effect';

/**
 * トライアタック（Tri Attack）技の効果
 *
 * 効果: 20%の確率でやけど・こおり・まひのいずれか1つをランダムに付与
 * (Has a 20% chance to burn, freeze, or paralyze the target)
 *
 * - 確率判定のあとに3つから1つを選ぶ。選んだ状態異常を付与できなければ、ほかの状態異常は付与しない（本家と同じ）
 * - 付与は canInflictStatus / inflictStatus で行う（タイプの免疫・相手の特性・かたやぶり・シンクロなどが効く）
 */
export class TriAttackEffect extends BaseRandomStatusConditionEffect {
  protected readonly chance = 0.2;
  protected readonly candidates: readonly RandomStatusConditionCandidate[] = [
    { status: StatusCondition.Burn, message: 'was burned!' },
    { status: StatusCondition.Freeze, message: 'was frozen solid!' },
    { status: StatusCondition.Paralysis, message: 'was paralyzed!' },
  ];
}
