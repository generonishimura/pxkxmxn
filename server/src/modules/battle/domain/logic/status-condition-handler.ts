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
        // こおり: 20%の確率で解除して行動可能
        return Math.random() < 0.2;
      case StatusCondition.Sleep:
        // ねむり: 行動不能（自動解除は別処理で行う）
        return false;
      case StatusCondition.Paralysis:
        // まひ: 25%の確率で行動不能
        return Math.random() >= 0.25;
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
        return Math.floor(status.maxHp / 16);
      case StatusCondition.Poison:
        // どく: 最大HPの1/8
        return Math.floor(status.maxHp / 8);
      case StatusCondition.BadPoison: {
        // もうどく: 最大HPの1/16から始まり、毎ターン増加（最大1/2）
        // ターン数に応じて: 1/16, 2/16, 3/16, ..., 8/16 (1/2)
        const damageRatio = Math.min((badPoisonTurnCount + 1) / 16, 8 / 16);
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
      return 0.5;
    }
    return 1.0;
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
    // 1ターン目: 33%の確率で解除
    // 2ターン目: 50%の確率で解除
    // 3ターン目: 100%の確率で解除
    if (sleepTurnCount === 0) {
      return Math.random() < 0.33;
    }
    if (sleepTurnCount === 1) {
      return Math.random() < 0.5;
    }
    return true; // 3ターン目以降は必ず解除
  }

  /**
   * こおりの自動解除判定
   * @returns 解除されるかどうか
   */
  static shouldClearFreeze(): boolean {
    // こおりは20%の確率で解除（行動前に判定）
    return Math.random() < 0.2;
  }
}

