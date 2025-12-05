import { BaseHpThresholdEffect } from '../base/base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * げきりゅう（Torrent）特性の効果
 * HPが1/3以下の時、みずタイプの威力1.5倍
 */
export class GekiryuuEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly affectedType = 'みず';
  protected readonly damageMultiplier = 1.5;

  /**
   * ダメージを与えるときに発動
   * HPが1/3以下かつみずタイプの技の場合、ダメージを1.5倍
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

    // みずタイプの技の場合、ダメージを1.5倍
    if (battleContext.moveTypeName === this.affectedType) {
      return Math.floor(damage * this.damageMultiplier);
    }

    // みずタイプでない場合は修正しない
    return undefined;
  }
}

