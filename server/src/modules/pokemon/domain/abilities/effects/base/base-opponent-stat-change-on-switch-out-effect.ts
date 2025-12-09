import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { StatType } from './base-opponent-stat-change-effect';

/**
 * 場から下がるとき（onSwitchOut）に相手のステータスランクを変更する基底クラス
 * いとあみ（Sticky Web）などで使用
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseOpponentStatChangeOnSwitchOutEffect implements IAbilityEffect {
  /**
   * 変更するステータスの種類
   */
  protected abstract readonly statType: StatType;

  /**
   * 変更するランク数（正の値で上昇、負の値で下降）
   */
  protected abstract readonly rankChange: number;

  /**
   * 場から下がるときに発動
   * 相手のステータスランクを変更
   */
  async onSwitchOut(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository) {
      return;
    }

    const battle = battleContext.battle;

    // 相手のトレーナーIDを取得
    const opponentTrainerId =
      pokemon.trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;

    // 相手のアクティブなポケモンを取得
    const opponentPokemon = await battleContext.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      opponentTrainerId,
    );

    if (!opponentPokemon) {
      return;
    }

    // 現在のランクを取得
    const currentRank = opponentPokemon.getStatRank(this.statType);

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

    // 相手のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(opponentPokemon.id, updateData);
  }
}

