import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { StatCalculator } from '@/modules/battle/domain/logic/stat-calculator';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

/**
 * ダウンロード（Download）特性の効果
 * 場に出たとき、相手の防御と特防を比べ、防御のほうが低ければ攻撃ランクを、そうでなければ特攻ランクを1上げる
 *
 * - 防御と特防が同じなら特攻を上げる（本家と同じ）
 * - 比べるのはランク補正込みの値（本家の getStat(stat, false, true) と同じ）。
 *   プラスは floor(実数値 × (2 + ランク) / 2)、マイナスは floor(実数値 × 2 / (2 - ランク))
 * - 実数値は育成ポケモンから計算する。パワーシェアなどで上書きされていれば volatileState.statOverrides を使う
 * - 相手が場にいない・ひんしのときは何もしない
 *
 * 注: バトル開始時は、トレーナー1の先発が場に出た時点でトレーナー2の先発がまだいないため、
 * トレーナー1の先発のダウンロードは発動しない（いかくと同じエンジンの順番による）
 */
export class DownloadEffect implements IAbilityEffect {
  private static readonly ABILITY_NAME = 'ダウンロード';

  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (!battleContext?.battleRepository || !battleContext.trainedPokemonRepository) {
      return;
    }

    const battle = battleContext.battle;
    const opponentTrainerId =
      pokemon.trainerId === battle.trainer1Id ? battle.trainer2Id : battle.trainer1Id;
    const opponent = await battleContext.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      opponentTrainerId,
    );
    if (!opponent || opponent.currentHp <= 0) {
      return;
    }

    const opponentTrained = await battleContext.trainedPokemonRepository.findById(
      opponent.trainedPokemonId,
    );
    if (!opponentTrained) {
      return;
    }

    const stats = this.calculateStats(opponentTrained);
    const overrides = opponent.volatileState.statOverrides;
    const defense = this.applyRank(overrides?.defense ?? stats.defense, opponent.defenseRank);
    const specialDefense = this.applyRank(
      overrides?.specialDefense ?? stats.specialDefense,
      opponent.specialDefenseRank,
    );

    await applyStatChanges(
      pokemon,
      [{ statType: defense < specialDefense ? 'attack' : 'specialAttack', rankChange: 1 }],
      battleContext,
      {
        source: {
          pokemon,
          abilityName: DownloadEffect.ABILITY_NAME,
          kind: 'ability',
          name: DownloadEffect.ABILITY_NAME,
        },
      },
    );
  }

  /**
   * ランク補正を掛ける（本家と同じく、マイナスは割り算で切り捨てる）
   */
  private applyRank(stat: number, rank: number): number {
    return rank >= 0 ? Math.floor((stat * (2 + rank)) / 2) : Math.floor((stat * 2) / (2 - rank));
  }

  /**
   * 育成ポケモンから防御・特防の実数値（ランク補正なし）を計算する
   */
  private calculateStats(trainedPokemon: TrainedPokemon): {
    defense: number;
    specialDefense: number;
  } {
    const { defense, specialDefense } = StatCalculator.calculate({
      baseHp: trainedPokemon.pokemon.baseHp,
      baseAttack: trainedPokemon.pokemon.baseAttack,
      baseDefense: trainedPokemon.pokemon.baseDefense,
      baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
      baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
      baseSpeed: trainedPokemon.pokemon.baseSpeed,
      level: trainedPokemon.level,
      ivHp: trainedPokemon.ivHp,
      ivAttack: trainedPokemon.ivAttack,
      ivDefense: trainedPokemon.ivDefense,
      ivSpecialAttack: trainedPokemon.ivSpecialAttack,
      ivSpecialDefense: trainedPokemon.ivSpecialDefense,
      ivSpeed: trainedPokemon.ivSpeed,
      evHp: trainedPokemon.evHp,
      evAttack: trainedPokemon.evAttack,
      evDefense: trainedPokemon.evDefense,
      evSpecialAttack: trainedPokemon.evSpecialAttack,
      evSpecialDefense: trainedPokemon.evSpecialDefense,
      evSpeed: trainedPokemon.evSpeed,
      nature: trainedPokemon.nature,
    });
    return { defense, specialDefense };
  }
}
