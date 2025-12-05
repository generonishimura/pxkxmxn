import { BaseStatBoostEffect } from '../base/base-stat-boost-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * はりきり（Guts）特性の効果
 * 状態異常時、攻撃ランク+1
 */
export class GutsEffect extends BaseStatBoostEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = 1;

  /**
   * 場に出すときに発動
   * 状態異常がある場合のみ、攻撃ランクを+1
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    // 状態異常がある場合のみ発動（None以外）
    if (
      pokemon.statusCondition === null ||
      pokemon.statusCondition === StatusCondition.None
    ) {
      return;
    }

    // 親クラスのonEntryを呼び出してステータスランクを上昇
    await super.onEntry(pokemon, battleContext);
  }
}


