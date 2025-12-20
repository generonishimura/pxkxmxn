import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * すいほう（Water Bubble）特性の効果
 * やけど無効化 + ほのおタイプの技のダメージ半減
 */
export class WaterBubbleEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Burn] as const;

  /**
   * ほのおタイプの技のダメージ倍率
   */
  private static readonly FIRE_TYPE_DAMAGE_MULTIPLIER = 0.5;

  /**
   * ダメージを受けるときに発動
   * ほのおタイプの技の場合、ダメージを半減
   */
  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    // 技のタイプ情報がない場合は修正しない
    if (!battleContext?.moveTypeName) {
      return damage;
    }

    // ほのおタイプの技の場合はダメージを半減
    if (battleContext.moveTypeName === 'ほのお') {
      return Math.floor(damage * WaterBubbleEffect.FIRE_TYPE_DAMAGE_MULTIPLIER);
    }

    // ほのおタイプでない場合は修正しない
    return damage;
  }
}

