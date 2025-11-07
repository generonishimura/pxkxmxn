import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';

/**
 * AccuracyCalculator
 * 技の命中率判定ロジック
 *
 * 命中率計算式:
 * 実効命中率 = (技の命中率 * 命中ランク補正) / (命中ランク補正 + 回避ランク補正)
 *
 * 考慮する要素:
 * - 技の基本命中率（accuracy）
 * - 命中ランク補正（accuracyRank）
 * - 回避ランク補正（evasionRank）
 * - 特性効果（AbilityRegistryを使用）
 * - 必中技（accuracy === null）の場合は常に命中
 */
export class AccuracyCalculator {
  /**
   * ランク補正の倍率を計算
   * ポケモンのランク補正式:
   * - 正のランク: (3 + rank) / 3
   * - 負のランク: 3 / (3 - rank)
   */
  private static calculateRankMultiplier(rank: number): number {
    // ランクを-6から+6の範囲に制限
    const clampedRank = Math.max(-6, Math.min(6, rank));

    if (clampedRank === 0) {
      return 1.0;
    }

    if (clampedRank > 0) {
      // 正のランク: (3 + rank) / 3
      return (3 + clampedRank) / 3;
    } else {
      // 負のランク: 3 / (3 - rank)
      return 3 / (3 - clampedRank);
    }
  }

  /**
   * 命中率を判定
   * @param moveAccuracy 技の命中率（0-100、必中技の場合はnull）
   * @param attacker 攻撃側のポケモンステータス
   * @param defender 防御側のポケモンステータス
   * @param attackerAbilityName 攻撃側の特性名（オプション）
   * @param defenderAbilityName 防御側の特性名（オプション）
   * @param battleContext バトルコンテキスト（オプション）
   * @returns 命中する場合はtrue、外れる場合はfalse
   */
  static checkHit(
    moveAccuracy: number | null,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAbilityName?: string,
    defenderAbilityName?: string,
    battleContext?: BattleContext,
  ): boolean {
    // 必中技の場合は常に命中
    if (moveAccuracy === null) {
      return true;
    }

    // 基本命中率（0-100）
    let effectiveAccuracy = moveAccuracy;

    // 命中ランク補正を取得
    const accuracyMultiplier = this.calculateRankMultiplier(attacker.accuracyRank);

    // 回避ランク補正を取得
    const evasionMultiplier = this.calculateRankMultiplier(defender.evasionRank);

    // 実効命中率を計算: accuracy * (accuracyMultiplier / evasionMultiplier)
    // ランク補正は命中率と回避率の比率で適用される
    const finalAccuracy = effectiveAccuracy * (accuracyMultiplier / evasionMultiplier);

    // 特性による命中率補正（攻撃側）
    // デフォルトはfinalAccuracyを使用し、特性による補正がある場合のみ上書き
    effectiveAccuracy = finalAccuracy;
    if (attackerAbilityName) {
      const abilityEffect = AbilityRegistry.get(attackerAbilityName);
      if (abilityEffect?.modifyAccuracy) {
        const modifiedAccuracy = abilityEffect.modifyAccuracy(attacker, finalAccuracy, battleContext);
        if (modifiedAccuracy !== undefined) {
          effectiveAccuracy = modifiedAccuracy;
        }
      }
    }

    // 特性による回避率補正（防御側）
    if (defenderAbilityName) {
      const abilityEffect = AbilityRegistry.get(defenderAbilityName);
      if (abilityEffect?.modifyEvasion) {
        const modifiedEvasion = abilityEffect.modifyEvasion(defender, effectiveAccuracy, battleContext);
        if (modifiedEvasion !== undefined) {
          // modifiedEvasionの期待値は0.0〜1.0（0.0:回避補正なし, 1.0:完全回避）
          // この計算式により、modifiedEvasionが大きいほど命中率が低下する（例: 0.2なら命中率80%、1.0なら0%）
          effectiveAccuracy = effectiveAccuracy * (1 - modifiedEvasion);
        }
      }
    }

    // 0-100の範囲に制限
    effectiveAccuracy = Math.max(0, Math.min(100, effectiveAccuracy));

    // ランダムな値（0-100）を生成して命中判定
    const randomValue = Math.random() * 100;
    return randomValue < effectiveAccuracy;
  }

}

