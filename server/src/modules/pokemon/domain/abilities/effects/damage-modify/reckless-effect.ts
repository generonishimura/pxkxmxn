import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * すてみ（Reckless）特性の効果
 * 反動ダメージがある技の威力1.2倍
 */
export class RecklessEffect implements IAbilityEffect {
  /**
   * ダメージ倍率
   */
  private static readonly DAMAGE_MULTIPLIER = 1.2;

  /**
   * ダメージを与えるときに発動
   * 反動ダメージがある技の場合、ダメージを1.2倍に
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 反動ダメージがある技でない場合は修正しない
    if (!battleContext.hasRecoil) {
      return undefined;
    }

    // 反動ダメージがある技の場合、ダメージを1.2倍に
    return Math.floor(damage * RecklessEffect.DAMAGE_MULTIPLIER);
  }
}
