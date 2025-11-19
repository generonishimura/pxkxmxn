import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 状態異常無効化の基底クラス
 * 特定の状態異常を無効化する汎用的な実装
 *
 * 各特性は、このクラスを継承して無効化する状態異常を設定するだけで実装できる
 */
export abstract class BaseStatusConditionImmunityEffect implements IAbilityEffect {
  /**
   * 無効化する状態異常の配列
   */
  protected abstract readonly immuneStatusConditions: readonly StatusCondition[];

  /**
   * 状態異常を受けられるかどうかを判定
   * 無効化する状態異常の場合はfalseを返す
   */
  canReceiveStatusCondition(
    _pokemon: BattlePokemonStatus,
    statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): boolean {
    return !this.immuneStatusConditions.includes(statusCondition);
  }
}

