import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * HP閾値の種類
 */
export type HpThresholdType = 'full' | 'half' | 'third' | 'quarter' | 'custom';

/**
 * HP閾値による効果の基底クラス
 * 特定のHP閾値を満たす場合に効果を発動する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 * 具体的な効果（ダメージ修正など）はサブクラスで実装する
 */
export abstract class BaseHpThresholdEffect implements IAbilityEffect {
  /**
   * HP閾値の種類
   */
  protected abstract readonly thresholdType: HpThresholdType;

  /**
   * カスタムHP閾値（thresholdTypeが'custom'の場合に使用）
   * 最大HPに対する割合（0.0-1.0、例: 0.33は1/3）
   */
  protected customThreshold?: number;

  /**
   * ダメージを受けるときに発動する効果
   *
   * このメソッドは`IAbilityEffect`インターフェースの`modifyDamage`に対応します。
   * デフォルト実装ではダメージを変更しません（そのまま返す）。
   *
   * サブクラスでHP閾値に基づくダメージ修正を実装する場合は、このメソッドをオーバーライドしてください。
   * オーバーライド時は、`checkHpThreshold`メソッドを使用してHP閾値をチェックし、
   * 閾値を満たしている場合のみダメージを修正してください。
   *
   * @param pokemon 対象のポケモン
   * @param damage 受けるダメージ
   * @param _battleContext バトルコンテキスト（デフォルト実装では未使用）
   * @returns 修正後のダメージ（デフォルト実装では変更なし）
   */
  modifyDamage?(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    return damage;
  }

  /**
   * HP閾値を満たしているかチェック
   */
  protected checkHpThreshold(pokemon: BattlePokemonStatus): boolean {
    const currentHpRatio = pokemon.currentHp / pokemon.maxHp;

    switch (this.thresholdType) {
      case 'full':
        // HPが満タンの場合
        return pokemon.currentHp >= pokemon.maxHp;
      case 'half':
        // HPが半分以下の場合
        return currentHpRatio <= 0.5;
      case 'third':
        // HPが1/3以下の場合
        return currentHpRatio <= 1 / 3;
      case 'quarter':
        // HPが1/4以下の場合
        return currentHpRatio <= 0.25;
      case 'custom':
        // カスタム閾値
        if (this.customThreshold !== undefined) {
          return currentHpRatio <= this.customThreshold;
        }
        return false;
      default:
        return false;
    }
  }
}

