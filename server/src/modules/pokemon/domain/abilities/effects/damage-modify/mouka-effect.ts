import { BaseHpThresholdEffect } from '../base/base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * もうか（Blaze）特性の効果
 * HPが1/3以下の時、ほのおタイプの威力1.5倍
 */
export class MoukaEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly affectedType = 'ほのお';
  protected readonly damageMultiplier = 1.5;

  /**
   * ダメージを与えるときに発動
   * HPが1/3以下かつほのおタイプの技の場合、ダメージを1.5倍
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    // HP閾値をチェック
    if (!this.checkHpThreshold(_pokemon)) {
      return undefined;
    }

    // 技のタイプ情報がない場合は修正しない
    if (!battleContext?.moveTypeName) {
      return undefined;
    }

    // ほのおタイプの技の場合、ダメージを1.5倍
    if (battleContext.moveTypeName === this.affectedType) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // ほのおタイプでない場合は修正しない
    return undefined;
  }
}

