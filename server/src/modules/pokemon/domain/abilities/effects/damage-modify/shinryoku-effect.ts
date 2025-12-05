import { BaseHpThresholdEffect } from '../base/base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * しんりょく（Overgrow）特性の効果
 * HPが1/3以下の時、くさタイプの威力1.5倍
 */
export class ShinryokuEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly affectedType = 'くさ';
  protected readonly damageMultiplier = 1.5;

  /**
   * ダメージを与えるときに発動
   * HPが1/3以下かつくさタイプの技の場合、ダメージを1.5倍
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

    // くさタイプの技の場合、ダメージを1.5倍
    if (battleContext.moveTypeName === this.affectedType) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // くさタイプでない場合は修正しない
    return undefined;
  }
}

