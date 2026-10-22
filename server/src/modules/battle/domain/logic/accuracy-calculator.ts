import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { alwaysHitsByVolatile, ignoresPositiveEvasionByVolatile } from './volatile-modifiers';
// 場の状態・設置技・交代の仕組み（Issue #107 一部）
import { getGlobalFieldState } from '../state/side-state';
import { GRAVITY_ACCURACY_MODIFIER } from './field-modifiers';

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
 * - 一時的な状態: 使用者のロックオン・こころのめ、相手のテレキネシスなら必ず命中。
 *   相手がみやぶられている（みやぶる・かぎわける・ミラクルアイ）なら、上がった回避ランクを 0 として扱う
 * - 場の状態: じゅうりょくの間は命中率を 6840/4096 倍にする（特性の補正の前）
 * - 特性の modifyBaseAccuracy（攻撃側 → 防御側。ミラクルスキン）: ランク補正の前の命中率を変える
 * - 特性の ensuresMoveHit（攻撃側・防御側。ノーガード）・options.ensuresHit（どくタイプのどくどく）: 必ず命中
 *
 * 変化技も、相手を対象にする技なら命中判定をする（MoveExecutorService が呼ぶ）
 */
export class AccuracyCalculator {
  /**
   * どくタイプが使うと必ず当たる技（第8世代から。本家は hitStepAccuracy で決め打ちしている）
   */
  private static readonly POISON_USER_ALWAYS_HIT_MOVE = 'どくどく';

  /**
   * 技と使用者のタイプから、必ず当たる技か（どくタイプが使うどくどく）
   * 隠れている相手（そらをとぶなど）にも当たる
   */
  static alwaysHitsByMoveUser(moveName: string, userTypeNames: readonly string[]): boolean {
    return moveName === this.POISON_USER_ALWAYS_HIT_MOVE && userTypeNames.includes('どく');
  }

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
   * @param options.ensuresHit 技の側の理由で必ず当たる（どくタイプが使うどくどく）
   * @returns 命中する場合はtrue、外れる場合はfalse
   */
  static checkHit(
    moveAccuracy: number | null,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAbilityName?: string,
    defenderAbilityName?: string,
    battleContext?: BattleContext,
    options: { readonly ensuresHit?: boolean } = {},
  ): boolean {
    // 必中技の場合は常に命中
    if (moveAccuracy === null || options.ensuresHit === true) {
      return true;
    }

    // ノーガード（攻撃側・防御側のどちらか。かたやぶりでは無視されない）なら必ず命中
    if (this.ensuresHitByAbility(attackerAbilityName, defenderAbilityName)) {
      return true;
    }

    // ロックオン・こころのめ（使用者）、テレキネシス（相手）なら必ず命中
    if (alwaysHitsByVolatile(attacker.volatileState, defender.volatileState)) {
      return true;
    }

    // 基本命中率（0-100）。ランク補正の前に、特性の modifyBaseAccuracy（ミラクルスキン）を反映する
    let effectiveAccuracy = this.resolveBaseAccuracy(
      moveAccuracy,
      attacker,
      defender,
      attackerAbilityName,
      defenderAbilityName,
      battleContext,
    );

    // 命中ランク補正を取得（てんねんの防御側などで無視される）
    const accuracyRank = battleContext?.ignoredAttackerRanks?.has('accuracy')
      ? 0
      : attacker.accuracyRank;
    const accuracyMultiplier = this.calculateRankMultiplier(accuracyRank);

    // 回避ランク補正を取得（なしくずし・てんねんの攻撃側・しんがんなどで無視される）
    // みやぶられている相手の上がった回避ランクは 0 として扱う（下がったランクはそのまま）
    const evasionRank = battleContext?.ignoredDefenderRanks?.has('evasion')
      ? 0
      : ignoresPositiveEvasionByVolatile(defender.volatileState)
        ? Math.min(0, defender.evasionRank)
        : defender.evasionRank;
    const evasionMultiplier = this.calculateRankMultiplier(evasionRank);

    // 実効命中率を計算: accuracy * (accuracyMultiplier / evasionMultiplier)
    // ランク補正は命中率と回避率の比率で適用される
    const rankedAccuracy = effectiveAccuracy * (accuracyMultiplier / evasionMultiplier);
    // じゅうりょく（本家の onModifyAccuracy の chainModify([6840, 4096])）
    const sideState = battleContext?.battle?.sideState;
    const finalAccuracy =
      sideState && getGlobalFieldState(sideState).gravityTurns !== undefined
        ? (rankedAccuracy * GRAVITY_ACCURACY_MODIFIER) / 4096
        : rankedAccuracy;

    // 特性による命中率補正（攻撃側）
    // デフォルトはfinalAccuracyを使用し、特性による補正がある場合のみ上書き
    effectiveAccuracy = finalAccuracy;
    if (attackerAbilityName) {
      const abilityEffect = AbilityRegistry.get(attackerAbilityName);
      if (abilityEffect?.modifyAccuracy) {
        const modifiedAccuracy = abilityEffect.modifyAccuracy(
          attacker,
          finalAccuracy,
          battleContext,
        );
        if (modifiedAccuracy !== undefined) {
          effectiveAccuracy = modifiedAccuracy;
        }
      }
    }

    // 特性による回避率補正（防御側）
    // 攻撃側がかたやぶりを持っている場合は、防御側の特性効果を無視
    if (
      defenderAbilityName &&
      !AbilityRegistry.isIgnoredByMoldBreaker(
        attackerAbilityName,
        defenderAbilityName,
        battleContext,
      )
    ) {
      const abilityEffect = AbilityRegistry.get(defenderAbilityName);
      if (abilityEffect?.modifyEvasion) {
        const modifiedEvasion = abilityEffect.modifyEvasion(
          defender,
          effectiveAccuracy,
          battleContext,
        );
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

  /**
   * 攻撃側か防御側の特性が、技を必ず当てる特性（ensuresMoveHit。ノーガード）か
   */
  static ensuresHitByAbility(
    attackerAbilityName: string | undefined,
    defenderAbilityName: string | undefined,
  ): boolean {
    return [attackerAbilityName, defenderAbilityName].some(
      name => name !== undefined && AbilityRegistry.get(name)?.ensuresMoveHit === true,
    );
  }

  /**
   * ランク補正の前の命中率（攻撃側 → 防御側の特性の modifyBaseAccuracy。防御側はかたやぶりで無視される）
   */
  private static resolveBaseAccuracy(
    moveAccuracy: number,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    attackerAbilityName: string | undefined,
    defenderAbilityName: string | undefined,
    battleContext: BattleContext | undefined,
  ): number {
    let accuracy = moveAccuracy;
    if (attackerAbilityName) {
      accuracy =
        AbilityRegistry.get(attackerAbilityName)?.modifyBaseAccuracy?.(
          attacker,
          'attacker',
          accuracy,
          battleContext,
        ) ?? accuracy;
    }
    if (
      defenderAbilityName &&
      !AbilityRegistry.isIgnoredByMoldBreaker(
        attackerAbilityName,
        defenderAbilityName,
        battleContext,
      )
    ) {
      accuracy =
        AbilityRegistry.get(defenderAbilityName)?.modifyBaseAccuracy?.(
          defender,
          'defender',
          accuracy,
          battleContext,
        ) ?? accuracy;
    }
    return accuracy;
  }
}
