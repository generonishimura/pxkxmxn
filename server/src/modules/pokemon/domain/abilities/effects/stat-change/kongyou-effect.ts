import { BaseHpThresholdEffect } from '../base/base-hp-threshold-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatType } from '../base/base-stat-boost-effect';

/**
 * ステータスタイプからBattlePokemonStatusのプロパティ名へのマッピング
 * BaseStatBoostEffectと同じマッピングを使用
 */
const statRankPropMap: Record<StatType, keyof BattlePokemonStatus> = {
  attack: 'attackRank',
  defense: 'defenseRank',
  specialAttack: 'specialAttackRank',
  specialDefense: 'specialDefenseRank',
  speed: 'speedRank',
  accuracy: 'accuracyRank',
  evasion: 'evasionRank',
};

/**
 * こんじょう（Guts）特性の効果
 * HPが1/3以下の時、攻撃ランク+1
 */
export class KongyouEffect extends BaseHpThresholdEffect {
  protected readonly thresholdType = 'third' as const;
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = 1;

  /**
   * 場に出すときに発動
   * HPが1/3以下の場合のみ、攻撃ランクを+1
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    // HP閾値をチェック
    if (!this.checkHpThreshold(pokemon)) {
      return;
    }

    if (!battleContext?.battleRepository) {
      return;
    }

    // 現在のランクを取得
    const currentRank = pokemon.getStatRank(this.statType);

    // 新しいランクを計算（-6から+6の範囲内で）
    const newRank = Math.max(-6, Math.min(6, currentRank + this.rankChange));

    // statTypeからプロパティ名を取得してupdateDataを構築
    const propName = statRankPropMap[this.statType];
    const updateData: Partial<BattlePokemonStatus> = {
      [propName]: newRank,
    } as Partial<BattlePokemonStatus>;

    // 自分のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, updateData);
  }
}

