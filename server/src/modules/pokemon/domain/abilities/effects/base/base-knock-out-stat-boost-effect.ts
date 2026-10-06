import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { StatType } from './base-opponent-stat-change-effect';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * 自分の技で相手をひんしにしたときに、自分の能力ランクを上げる基底クラス
 * （例: しろのいななき、くろのいななき）
 *
 * 各特性は、このクラスを継承して上げる能力と特性名を設定するだけで実装できる
 * 反動・状態異常などで相手が倒れたときは発動しない（エンジンの onKnockOut が技で倒したときだけ呼ばれる）
 */
export abstract class BaseKnockOutStatBoostEffect implements IAbilityEffect {
  /**
   * 上げる能力
   */
  protected abstract readonly statType: StatType;

  /**
   * 特性名（能力ランクの変化の原因として渡す）
   */
  protected abstract readonly abilityName: string;

  async onKnockOut(
    holder: BattlePokemonStatus,
    _fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: this.statType, rankChange: 1 }],
      battleContext,
      {
        source: {
          pokemon: holder,
          abilityName: this.abilityName,
          kind: 'ability',
          name: this.abilityName,
        },
      },
    );
    return joinStatChangeMessages(result);
  }
}
