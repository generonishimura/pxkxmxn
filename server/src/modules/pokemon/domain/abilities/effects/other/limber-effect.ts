import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * じゅうなん（Limber）特性の効果
 * まひ状態異常を無効化する
 */
export class LimberEffect implements IAbilityEffect {
  /**
   * 状態異常を受けられるかどうかを判定
   * まひ状態異常を無効化する
   * @param _pokemon 対象のポケモン
   * @param statusCondition 付与されようとしている状態異常
   * @param _battleContext バトルコンテキスト
   * @returns まひの場合はfalse（無効化）、それ以外はundefined（判定しない）
   */
  canReceiveStatusCondition(
    _pokemon: BattlePokemonStatus,
    statusCondition: StatusCondition,
    _battleContext?: BattleContext,
  ): boolean | undefined {
    // まひ状態異常を無効化
    if (statusCondition === StatusCondition.Paralysis) {
      return false;
    }
    // それ以外の状態異常は判定しない
    return undefined;
  }
}
