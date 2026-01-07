import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * はやあし（Quick Feet）特性の効果
 * 状態異常時に素早さを1.5倍にする
 */
export class QuickFeetEffect implements IAbilityEffect {
  /**
   * 状態異常時の速度倍率
   */
  private static readonly STATUS_CONDITION_SPEED_MULTIPLIER = 1.5;

  /**
   * 速度を修正
   * 状態異常がある場合、速度を1.5倍にする
   */
  modifySpeed(
    pokemon: BattlePokemonStatus,
    speed: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    // 状態異常がない場合は修正しない
    if (
      pokemon.statusCondition === null ||
      pokemon.statusCondition === StatusCondition.None
    ) {
      return undefined;
    }

    // 状態異常がある場合、速度を1.5倍にする
    return Math.floor(speed * QuickFeetEffect.STATUS_CONDITION_SPEED_MULTIPLIER);
  }
}
