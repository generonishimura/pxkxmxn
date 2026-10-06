import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { resolveAbilityName } from '../../../battle-events/ability-lookup';

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
    const opponentPokemon =
      await battleContext.battleRepository.findActivePokemonByBattleIdAndTrainerId(
        battle.id,
        opponentTrainerId,
      );

    if (!opponentPokemon) {
      return;
    }

    // 相手のランクを変える。原因はこの特性（いかくなど）と持ち主
    // クリアボディ・ミラーアーマー・ばんけんなどの相手の特性は applyStatChanges が判定する
    const abilityName = await resolveAbilityName(pokemon, battleContext);
    await applyStatChanges(
      opponentPokemon,
      [{ statType: this.statType, rankChange: this.rankChange }],
      battleContext,
      { source: { pokemon, abilityName, kind: 'ability', name: abilityName } },
    );
  }
}
