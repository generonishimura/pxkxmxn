import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import {
  BaseRandomStatusConditionEffect,
  RandomStatusConditionCandidate,
} from './base/base-random-status-condition-effect';

/**
 * フェイタルクロー（Dire Claw）技の効果
 *
 * 効果: 30%の確率で、どく・まひ・ねむりのいずれか1つをランダムに付与する
 * チャンピオンズの確率。SV は 50%
 *
 * - 確率判定のあとに3つから1つを選ぶ。選んだ状態異常を付与できなければ、ほかの状態異常は付与しない（本家と同じ）
 */
export class DireClawEffect extends BaseRandomStatusConditionEffect {
  protected readonly chance = 0.3;
  protected readonly candidates: readonly RandomStatusConditionCandidate[] = [
    { status: StatusCondition.Poison, message: 'was poisoned!' },
    { status: StatusCondition.Paralysis, message: 'was paralyzed!' },
    { status: StatusCondition.Sleep, message: 'fell asleep!' },
  ];
}
