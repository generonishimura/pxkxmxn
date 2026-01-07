import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * テクニシャン（Technician）特性の効果
 * 威力60以下の技の威力1.5倍
 */
export class TechnicianEffect implements IAbilityEffect {
  /**
   * 効果が発動する威力の上限
   */
  private static readonly MAX_POWER_THRESHOLD = 60;

  /**
   * ダメージ倍率
   */
  private static readonly DAMAGE_MULTIPLIER = 1.5;

  /**
   * ダメージを与えるときに発動
   * 威力60以下の技の場合、ダメージを1.5倍に
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 技の威力情報がない場合は修正しない
    if (battleContext.movePower === null || battleContext.movePower === undefined) {
      return undefined;
    }

    // 威力60以下の技の場合、ダメージを1.5倍に
    if (battleContext.movePower <= TechnicianEffect.MAX_POWER_THRESHOLD) {
      return Math.floor(damage * TechnicianEffect.DAMAGE_MULTIPLIER);
    }

    // 威力60より大きい場合は修正しない
    return undefined;
  }
}
