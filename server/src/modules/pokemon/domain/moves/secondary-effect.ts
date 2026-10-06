import { BattleContext } from '../abilities/battle-context.interface';

/**
 * 技の追加効果が発動するかを判定する
 *
 * - battleContext.secondaryEffectChanceMultiplier（てんのめぐみ = 2）を確率に掛ける
 * - target が 'target'（相手への追加効果）で battleContext.secondaryEffectsSuppressed（りんぷん）が
 *   true の場合は発動しない。自分への追加効果（'self'）は止まらない
 * - 確率が1以上の場合は乱数を使わずに発動する
 *
 * @param chance 追加効果の発動確率（0.0-1.0）
 * @param battleContext バトルコンテキスト
 * @param target 追加効果の対象（相手 or 自分）
 * @returns 発動する場合はtrue
 */
export const rollSecondaryEffect = (
  chance: number,
  battleContext?: BattleContext,
  target: 'target' | 'self' = 'target',
): boolean => {
  if (target === 'target' && battleContext?.secondaryEffectsSuppressed === true) {
    return false;
  }
  const effectiveChance = chance * (battleContext?.secondaryEffectChanceMultiplier ?? 1);
  if (effectiveChance >= 1) {
    return true;
  }
  return Math.random() < effectiveChance;
};
