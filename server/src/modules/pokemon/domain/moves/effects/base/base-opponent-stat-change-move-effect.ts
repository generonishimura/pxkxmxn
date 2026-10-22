import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, joinStatChangeMessages, moveEffectSource } from './base-stat-change-effect';
import { applyStatChanges } from '../../../battle-events/stat-change';

/**
 * 相手のステータスランクを変更する変化技の基底クラス
 * 変化技を使用したとき（onUse）に相手のステータスランクを変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseOpponentStatChangeMoveEffect implements IMoveEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 変化技を使用したときに発動
   * 相手のステータスランクを変更
   */
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 相手のランクを変える（クリアボディなどの防御側の特性は applyStatChanges が判定する）
    const result = await applyStatChanges(
      defender,
      [{ statType: this.statType, rankChange: this.rankChange }],
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return joinStatChangeMessages(result);
  }
}
