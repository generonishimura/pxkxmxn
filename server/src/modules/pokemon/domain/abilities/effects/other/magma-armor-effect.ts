import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * マグマのよろい（Magma Armor）特性の効果
 * こおり状態異常を無効化する
 */
export class MagmaArmorEffect implements IAbilityEffect {
  /**
   * 状態異常を受けられるかどうかを判定
   * こおり状態異常を無効化する
   * @param pokemon 対象のポケモン
   * @param statusCondition 付与されようとしている状態異常
   * @param battleContext バトルコンテキスト
   * @returns こおりの場合はfalse（無効化）、それ以外はundefined（判定しない）
   */
  canReceiveStatusCondition(
    pokemon: BattlePokemonStatus,
    statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): boolean | undefined {
    // こおり状態異常を無効化
    if (statusCondition === StatusCondition.Freeze) {
      return false;
    }
    // それ以外の状態異常は判定しない
    return undefined;
  }
}
