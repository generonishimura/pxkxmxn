import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatType } from './base-stat-change-effect';

/**
 * 自分のステータスランクを変更する変化技の基底クラス
 * 変化技を使用したとき（onUse）に自分のステータスランクを変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseSelfStatChangeMoveEffect implements IMoveEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * ステータスタイプからBattlePokemonStatusのプロパティ名へのマッピング
   */
  private static readonly statRankPropMap: Record<StatType, keyof BattlePokemonStatus> = {
    attack: 'attackRank',
    defense: 'defenseRank',
    specialAttack: 'specialAttackRank',
    specialDefense: 'specialDefenseRank',
    speed: 'speedRank',
    accuracy: 'accuracyRank',
    evasion: 'evasionRank',
  };

  /**
   * 変化技を使用したときに発動
   * 自分のステータスランクを変更
   */
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 現在のランクを取得
    const currentRank = attacker.getStatRank(this.statType);

    // 新しいランクを計算（-6から+6の範囲内で）
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankChange));

    // ランクが変化しない場合は何もしない
    if (newRank === currentRank) {
      return null;
    }

    // statTypeからプロパティ名を取得してupdateDataを構築
    const propName = BaseSelfStatChangeMoveEffect.statRankPropMap[this.statType];
    const updateData: Partial<BattlePokemonStatus> = {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>;

    // 自分のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, updateData);

    // メッセージを返す
    const statNameMap: Record<StatType, string> = {
      attack: 'Attack',
      defense: 'Defense',
      specialAttack: 'Special Attack',
      specialDefense: 'Special Defense',
      speed: 'Speed',
      accuracy: 'Accuracy',
      evasion: 'Evasion',
    };

    const statName = statNameMap[this.statType];
    const direction = this.rankChange > 0 ? 'rose' : 'fell';
    return `${statName} ${direction}!`;
  }
}

