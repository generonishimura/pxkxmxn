import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

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
 * 自分のステータスランクを上昇させる基底クラス
 * 場に出すとき（onEntry）に自分のステータスランクを変更する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseStatBoostEffect implements IAbilityEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 場に出すときに発動
   * 自分のステータスランクを変更
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    // 現在のランクを取得
    const currentRank = pokemon.getStatRank(this.statType);

    // 新しいランクを計算（-6から+6の範囲内で）
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankChange));

    // statTypeからプロパティ名をマッピングしてupdateDataを構築
    const statRankPropMap: Record<StatType, keyof BattlePokemonStatus> = {
      attack: 'attackRank',
      defense: 'defenseRank',
      specialAttack: 'specialAttackRank',
      specialDefense: 'specialDefenseRank',
      speed: 'speedRank',
      accuracy: 'accuracyRank',
      evasion: 'evasionRank',
    };
    const propName = statRankPropMap[this.statType];
    const updateData: Partial<BattlePokemonStatus> = { [propName]: newRank } as Partial<BattlePokemonStatus>;

    // 自分のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, updateData);
  }
}

