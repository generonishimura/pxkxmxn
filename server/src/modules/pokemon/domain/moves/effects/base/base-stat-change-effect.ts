import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * ステータスランクの種類
 */
export type StatType =
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'accuracy'
  | 'evasion';

/**
 * 相手のステータスランクを変更する技の基底クラス
 * 技が命中したとき（onHit）に相手のステータスランクを変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseStatChangeEffect implements IMoveEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 変化確率（0.0-1.0、1.0の場合は必ず変化）
   */
  protected abstract readonly chance: number;

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
   * 技が命中したときに発動
   * 確率に基づいて相手のステータスランクを変更
   */
  async onHit(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 確率判定（chanceが1.0の場合は必ず変化）
    if (this.chance < 1.0 && Math.random() >= this.chance) {
      return null;
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
    const propName = BaseStatChangeEffect.statRankPropMap[this.statType];
    const updateData: Partial<BattlePokemonStatus> = {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>;

    // 相手のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, updateData);

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

