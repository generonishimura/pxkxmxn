import { StatusCondition } from '../entities/status-condition.enum';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';

/**
 * 状態異常処理の結果
 */
export interface StatusConditionProcessResult {
  /**
   * 行動可能かどうか
   */
  canAct: boolean;
  /**
   * 受けるダメージ（ターン終了時）
   */
  damage?: number;
  /**
   * 状態異常が解除されたかどうか
   */
  cleared?: boolean;
  /**
   * 物理攻撃の倍率（やけどの場合0.5）
   */
  physicalAttackMultiplier?: number;
}

/**
 * StatusConditionHandler
 * 状態異常の効果を処理するドメインロジック
 *
 * 各状態異常の効果:
 * - やけど（Burn）: 物理攻撃0.5倍、ターン終了時に最大HPの1/16ダメージ
 * - こおり（Freeze）: 行動不能（20%の確率で解除）
 * - どく（Poison）: ターン終了時に最大HPの1/8ダメージ
 * - もうどく（BadPoison）: ターン終了時に最大HPの1/16から始まり、毎ターン増加（最大1/2）
 * - ねむり（Sleep）: 行動不能（1-3ターン後に自動解除）
 * - まひ（Paralysis）: 素早さ0.5倍（既存実装あり）、25%の確率で行動不能
 */
export class StatusConditionHandler {
  /**
   * こおりの解除確率（20%）
   */
  private static readonly FREEZE_THAW_CHANCE = 0.2;

  /**
   * まひによる行動不能の確率（25%）
   */
  private static readonly PARALYSIS_IMMOBILIZE_CHANCE = 0.25;

  /**
   * ねむり1ターン目の解除確率（33%）
   */
  private static readonly SLEEP_WAKE_CHANCE_TURN1 = 0.33;

  /**
   * ねむり2ターン目の解除確率（50%）
   */
  private static readonly SLEEP_WAKE_CHANCE_TURN2 = 0.5;

  /**
   * やけどによる物理攻撃倍率
   */
  private static readonly BURN_PHYSICAL_ATTACK_MULTIPLIER = 0.5;

  /**
   * 物理攻撃倍率のデフォルト値（やけど以外）
   */
  private static readonly DEFAULT_PHYSICAL_ATTACK_MULTIPLIER = 1.0;

  /**
   * やけどのダメージ計算の除数（最大HPの1/16）
   */
  private static readonly BURN_DAMAGE_DIVISOR = 16;

  /**
   * どくのダメージ計算の除数（最大HPの1/8）
   */
  private static readonly POISON_DAMAGE_DIVISOR = 8;

  /**
   * もうどくのダメージ計算の除数（最大HPの1/16から始まる）
   */
  private static readonly BAD_POISON_DAMAGE_DIVISOR = 16;

  /**
   * もうどくの最大ダメージ倍率（最大HPの1/2 = 8/16）
   */
  private static readonly BAD_POISON_MAX_DAMAGE_RATIO = 8 / 16;

  /**
   * 状態異常による行動可能判定
   * @param status ポケモンの状態
   * @returns 行動可能かどうか
   */
  static canAct(status: BattlePokemonStatus): boolean {
    if (!status.statusCondition || status.statusCondition === StatusCondition.None) {
      return true;
    }

    switch (status.statusCondition) {
      case StatusCondition.Freeze:
        // こおり: FREEZE_THAW_CHANCEの確率で解除して行動可能
        return Math.random() < StatusConditionHandler.FREEZE_THAW_CHANCE;
      case StatusCondition.Sleep:
        // ねむり: 行動不能（自動解除は別処理で行う）
        return false;
      case StatusCondition.Paralysis:
        // まひ: PARALYSIS_IMMOBILIZE_CHANCEの確率で行動不能
        return Math.random() >= StatusConditionHandler.PARALYSIS_IMMOBILIZE_CHANCE;
      default:
        return true;
    }
  }

  /**
   * ターン終了時の状態異常によるダメージを計算
   * @param status ポケモンの状態
   * @param badPoisonTurnCount もうどくのターン数（0から始まる）
   * @returns 受けるダメージ
   */
  static calculateTurnEndDamage(
    status: BattlePokemonStatus,
    badPoisonTurnCount: number = 0,
  ): number {
    if (!status.statusCondition || status.statusCondition === StatusCondition.None) {
      return 0;
    }

    switch (status.statusCondition) {
      case StatusCondition.Burn:
        // やけど: 最大HPの1/16
        return Math.floor(status.maxHp / StatusConditionHandler.BURN_DAMAGE_DIVISOR);
      case StatusCondition.Poison:
        // どく: 最大HPの1/8
        return Math.floor(status.maxHp / StatusConditionHandler.POISON_DAMAGE_DIVISOR);
      case StatusCondition.BadPoison: {
        // もうどく: 最大HPの1/16から始まり、毎ターン増加（最大1/2）
        // ターン数に応じて: 1/16, 2/16, 3/16, ..., 8/16 (1/2)
        const damageRatio = Math.min(
          (badPoisonTurnCount + 1) / StatusConditionHandler.BAD_POISON_DAMAGE_DIVISOR,
          StatusConditionHandler.BAD_POISON_MAX_DAMAGE_RATIO,
        );
        return Math.floor(status.maxHp * damageRatio);
      }
      default:
        return 0;
    }
  }

  /**
   * やけどによる物理攻撃倍率を取得
   * @param status ポケモンの状態
   * @returns 物理攻撃倍率（やけどの場合0.5、それ以外1.0）
   */
  static getPhysicalAttackMultiplier(status: BattlePokemonStatus): number {
    if (status.statusCondition === StatusCondition.Burn) {
      return StatusConditionHandler.BURN_PHYSICAL_ATTACK_MULTIPLIER;
    }
    return StatusConditionHandler.DEFAULT_PHYSICAL_ATTACK_MULTIPLIER;
  }

  /**
   * 状態異常が交代時に解除されるかどうか
   * @param statusCondition 状態異常
   * @returns 解除されるかどうか
   */
  static isClearedOnSwitch(statusCondition: StatusCondition | null): boolean {
    if (!statusCondition || statusCondition === StatusCondition.None) {
      return false;
    }

    // やけど・どく・もうどく・まひは交代時に解除
    // こおり・ねむりも交代時に解除される（実装簡略化のため）
    return [
      StatusCondition.Burn,
      StatusCondition.Poison,
      StatusCondition.BadPoison,
      StatusCondition.Paralysis,
      StatusCondition.Freeze,
      StatusCondition.Sleep,
    ].includes(statusCondition);
  }

  /**
   * ねむりの自動解除判定
   * @param sleepTurnCount ねむりのターン数（0から始まる）
   * @returns 解除されるかどうか
   */
  static shouldClearSleep(sleepTurnCount: number): boolean {
    // ねむりは1-3ターン後に自動解除
    // 1ターン目: SLEEP_WAKE_CHANCE_TURN1の確率で解除
    // 2ターン目: SLEEP_WAKE_CHANCE_TURN2の確率で解除
    // 3ターン目: 100%の確率で解除
    if (sleepTurnCount === 0) {
      return Math.random() < StatusConditionHandler.SLEEP_WAKE_CHANCE_TURN1;
    }
    if (sleepTurnCount === 1) {
      return Math.random() < StatusConditionHandler.SLEEP_WAKE_CHANCE_TURN2;
    }
    return true; // 3ターン目以降は必ず解除
  }

  /**
   * こおりの自動解除判定
   * @returns 解除されるかどうか
   */
  static shouldClearFreeze(): boolean {
    // こおりはFREEZE_THAW_CHANCEの確率で解除（行動前に判定）
    return Math.random() < StatusConditionHandler.FREEZE_THAW_CHANCE;
  }
}
