import { IAbilityEffect } from '../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../battle-context.interface';

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
 * 相手のステータスランクを変更する基底クラス
 * 場に出すとき（onEntry）に相手のステータスランクを変更する汎用的な実装
 *
 * 各特性は、このクラスを継承してパラメータを設定するだけで実装できる
 */
export abstract class BaseOpponentStatChangeEffect implements IAbilityEffect {
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
   * 相手のステータスランクを変更
   */
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
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

    // ステータスランクを更新するためのオブジェクトを作成
    // Partial<BattlePokemonStatus>ではreadonlyプロパティに直接代入できないため、
    // 型アサーションを使用して更新データを作成
    const updateData: Partial<BattlePokemonStatus> = {} as Partial<BattlePokemonStatus>;
    switch (this.statType) {
      case 'attack':
        (updateData as any).attackRank = newRank;
        break;
      case 'defense':
        (updateData as any).defenseRank = newRank;
        break;
      case 'specialAttack':
        (updateData as any).specialAttackRank = newRank;
        break;
      case 'specialDefense':
        (updateData as any).specialDefenseRank = newRank;
        break;
      case 'speed':
        (updateData as any).speedRank = newRank;
        break;
      case 'accuracy':
        (updateData as any).accuracyRank = newRank;
        break;
      case 'evasion':
        (updateData as any).evasionRank = newRank;
        break;
    }

    // 相手のステータスランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(opponentPokemon.id, updateData);
  }
}

