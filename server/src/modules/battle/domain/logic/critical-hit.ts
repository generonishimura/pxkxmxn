import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';
import { VolatileState } from '../state/volatile-state';

/**
 * 0 以上 1 未満の乱数を返す関数（Math.random と同じ形）
 */
export type RandomSource = () => number;

/**
 * 必ず急所になる急所ランク（これより上も必ず急所）
 */
export const ALWAYS_CRITICAL_HIT_STAGE = 3;

/**
 * 急所ランクごとの急所率（第9世代。本家の critMult = [0, 24, 8, 2, 1] で、ランク 0 が 1/24）
 */
export const CRITICAL_HIT_CHANCES: readonly number[] = [1 / 24, 1 / 8, 1 / 2, 1];

/**
 * 急所のダメージ倍率（第6世代から 1.5 倍。基礎ダメージに掛けて切り捨てる）
 */
export const CRITICAL_HIT_DAMAGE_MULTIPLIER = 1.5;

/**
 * きあいだめの急所ランクの上昇
 */
export const FOCUS_ENERGY_CRIT_STAGE_BOOST = 2;

/**
 * 急所ランクを 0〜3 に収める（3 は必ず急所）
 */
export const clampCriticalHitStage = (stage: number): number =>
  Math.max(0, Math.min(ALWAYS_CRITICAL_HIT_STAGE, Math.floor(stage)));

/**
 * 急所ランクから急所率を求める（ランク 0 = 1/24、1 = 1/8、2 = 1/2、3 以上 = 1）
 */
export const criticalHitChance = (stage: number): number =>
  CRITICAL_HIT_CHANCES[clampCriticalHitStage(stage)];

/**
 * 急所になるかを引く。急所ランク 3 以上なら乱数を引かずに急所になる
 * @param random 0 以上 1 未満の乱数を返す関数
 */
export const rollCriticalHit = (stage: number, random: RandomSource): boolean => {
  if (clampCriticalHitStage(stage) >= ALWAYS_CRITICAL_HIT_STAGE) {
    return true;
  }
  return random() < criticalHitChance(stage);
};

/**
 * 特性の補正の前の急所ランク（本家の move.critRatio と ModifyCritRatio の技・状態の分）
 * - 急所に当たりやすい技（MoveBehaviors の highCritRatio）: +1
 * - きあいだめなど（volatileState.critStageBoost）: その分足す
 * - 必ず急所になる技（alwaysCrit）・とぎすます（laserFocusTurns）: 必ず急所になるランク
 */
export const baseCriticalHitStage = (moveName: string, state: VolatileState): number => {
  if (MoveBehaviors.has(moveName, 'alwaysCrit') || state.laserFocusTurns !== undefined) {
    return ALWAYS_CRITICAL_HIT_STAGE;
  }
  const moveStage = MoveBehaviors.has(moveName, 'highCritRatio') ? 1 : 0;
  return clampCriticalHitStage(moveStage + (state.critStageBoost ?? 0));
};
