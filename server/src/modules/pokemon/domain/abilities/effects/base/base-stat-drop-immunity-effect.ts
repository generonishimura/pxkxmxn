import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatType } from './base-opponent-stat-change-effect';

/**
 * 特定の能力ランクが下がらない特性の基底クラス
 * はとむね（防御）、かいりきバサミ（攻撃）、するどいめ（命中率）などで使用
 *
 * `canReceiveStatChange` フックで、対象の能力を下げようとする能力変化を無効化する。
 * `BaseOpponentStatChangeMoveEffect` 等の能力変化を適用する側で本フックが参照される。
 *
 * 各特性は、このクラスを継承して対象の能力を設定するだけで実装できる
 */
export abstract class BaseStatDropImmunityEffect implements IAbilityEffect {
  /**
   * 低下を無効化する能力
   */
  protected abstract readonly protectedStat: StatType;

  canReceiveStatChange(
    _pokemon: BattlePokemonStatus,
    statType: StatType,
    rankChange: number,
    _battleContext?: BattleContext,
  ): boolean | undefined {
    if (statType === this.protectedStat && rankChange < 0) {
      return false;
    }
    return undefined;
  }
}
