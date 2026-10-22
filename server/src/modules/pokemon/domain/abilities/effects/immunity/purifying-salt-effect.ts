import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * きよめのしお（Purifying Salt）特性の効果
 * すべての主要状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）にならない。
 * また、ゴーストタイプの技を受けるとき、相手のこうげき・とくこうを半分にする
 *
 * 注: ゴーストタイプの技に対する攻撃ステータス半減は、受けるダメージを半減することで表現する。
 *     あくびは未実装のため、あくびを防ぐ効果は扱わない。
 *     状態異常の無効化は、canReceiveStatusCondition を参照する技の追加効果にのみ働く
 */
export class PurifyingSaltEffect extends BaseStatusConditionImmunityEffect {
  private static readonly GHOST_TYPE_NAME = 'ゴースト';
  private static readonly GHOST_DAMAGE_MULTIPLIER = 0.5;

  protected readonly immuneStatusConditions = [
    StatusCondition.Burn,
    StatusCondition.Freeze,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.BadPoison,
    StatusCondition.Sleep,
  ] as const;

  /**
   * ダメージを受けるときに発動
   * ゴーストタイプの技の場合、ダメージを半減する
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    if (battleContext?.moveTypeName !== PurifyingSaltEffect.GHOST_TYPE_NAME) {
      return damage;
    }
    return Math.floor(damage * PurifyingSaltEffect.GHOST_DAMAGE_MULTIPLIER);
  }
}
