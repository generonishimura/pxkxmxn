import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType, STAT_RANK_PROP_MAP, STAT_NAME_MAP } from './base-stat-change-effect';
import { AbilityRegistry } from '../../../abilities/ability-registry';

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
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 能力ランク変化を防御側の特性で無効化チェック
    // 攻撃側がかたやぶりを持っている場合は、防御側の特性効果を無視（既存パターン踏襲）
    if (
      this.rankChange < 0 &&
      battleContext.trainedPokemonRepository &&
      !AbilityRegistry.hasMoldBreaker(battleContext.attackerAbilityName)
    ) {
      const defenderTrainedPokemon = await battleContext.trainedPokemonRepository.findById(
        defender.trainedPokemonId,
      );
      if (defenderTrainedPokemon?.ability) {
        const defenderAbility = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
        if (defenderAbility?.canReceiveStatChange) {
          const canReceive = defenderAbility.canReceiveStatChange(
            defender,
            this.statType,
            this.rankChange,
            battleContext,
          );
          if (canReceive === false) {
            return null;
          }
        }
      }
    }

    // 現在のランクを取得
    const currentRank = defender.getStatRank(this.statType);

    // 新しいランクを計算（-6から+6の範囲内で）
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankChange));

    // ランクが変化しない場合は何もしない
    if (newRank === currentRank) {
      return null;
    }

    // statTypeからプロパティ名を取得してupdateDataを構築
    const propName = STAT_RANK_PROP_MAP[this.statType];
    const updateData: Partial<BattlePokemonStatus> = {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>;

    // 相手のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, updateData);

    // メッセージを返す
    const statName = STAT_NAME_MAP[this.statType];
    const direction = this.rankChange > 0 ? 'rose' : 'fell';
    return `${statName} ${direction}!`;
  }
}

