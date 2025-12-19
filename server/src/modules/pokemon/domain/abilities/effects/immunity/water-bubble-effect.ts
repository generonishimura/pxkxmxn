import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * すいほう（Water-bubble）特性の効果
 * やけど無効化 + ほのおタイプのダメージ半減
 */
export class WaterBubbleEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Burn] as const;

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
      return Math.floor(damage * 0.5);
    }

    // ほのおタイプでない場合は修正しない
    return damage;
  }
}

