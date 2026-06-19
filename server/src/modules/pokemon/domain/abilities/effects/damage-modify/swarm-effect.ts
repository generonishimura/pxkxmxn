import { BaseHpThresholdEffect } from '../base/base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * むしのしらせ（Swarm）特性の効果
 * HP が 1/3 以下のとき、むしタイプの技の威力を 1.5 倍にする
 *
 * 既存の `ShinryokuEffect`（くさ）/ `MoukaEffect`（ほのお）/ `GekiryuuEffect`（みず）と同パターン
 */
export class SwarmEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly affectedType = 'むし';
  protected readonly damageMultiplier = 1.5;

  modifyDamageDealt(
    pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!this.checkHpThreshold(pokemon)) {
      return undefined;
    }

    if (!battleContext?.moveTypeName) {
      return undefined;
    }

    if (battleContext.moveTypeName === this.affectedType) {
      return Math.floor(damage * this.damageMultiplier);
    }

    return undefined;
  }
}
