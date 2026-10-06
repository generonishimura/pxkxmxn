import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * わざわい系特性の基底クラス
 * 相手のステータス 1 つを 0.75 倍にする効果を、ダメージ倍率として表現する
 *
 * - 相手の攻撃系（こうげき / とくこう）を下げる特性:
 *   対象カテゴリの技で受けるダメージを 0.75 倍にする（modifyDamage）
 * - 相手の防御系（ぼうぎょ / とくぼう）を下げる特性:
 *   対象カテゴリの技で与えるダメージを 1/0.75 倍にする（modifyDamageDealt）
 *
 * 各特性は、このクラスを継承して下げるステータスの種類と技のカテゴリを設定するだけで実装できる
 */
export abstract class BaseRuinEffect implements IAbilityEffect {
  /**
   * 相手のステータスに掛かる倍率
   */
  private static readonly STAT_MULTIPLIER = 0.75;

  /**
   * 下げる相手のステータスの種類
   * - offense: こうげき / とくこう（受けるダメージが減る）
   * - defense: ぼうぎょ / とくぼう（与えるダメージが増える）
   */
  protected abstract readonly loweredStat: 'offense' | 'defense';

  /**
   * 効果が及ぶ技のカテゴリ
   */
  protected abstract readonly moveCategory: 'Physical' | 'Special';

  /**
   * ダメージを受けるときに発動
   * 相手の攻撃系ステータスを下げる特性の場合、対象カテゴリの技のダメージを 0.75 倍にする
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (this.loweredStat !== 'offense' || battleContext?.moveCategory !== this.moveCategory) {
      return damage;
    }
    return Math.floor(damage * BaseRuinEffect.STAT_MULTIPLIER);
  }

  /**
   * ダメージを与えるときに発動
   * 相手の防御系ステータスを下げる特性の場合、対象カテゴリの技のダメージを 1/0.75 倍にする
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (this.loweredStat !== 'defense' || battleContext?.moveCategory !== this.moveCategory) {
      return undefined;
    }
    return Math.floor(damage / BaseRuinEffect.STAT_MULTIPLIER);
  }
}
