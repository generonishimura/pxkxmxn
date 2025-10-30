import { IAbilityEffect } from '../ability-effect.interface';
import { BattlePokemonStatus } from '../../../../battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../battle-context.interface';

/**
 * 「いかく」特性の効果実装
 *
 * 効果: 場に出すとき、相手の攻撃ランクを1段階下げる
 */
export class IntimidateEffect implements IAbilityEffect {
  /**
   * 場に出すときに発動
   * 相手の攻撃ランクを1段階下げる
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

    // 攻撃ランクを1段階下げる（-6から+6の範囲内で）
    const newAttackRank = Math.max(-6, opponentPokemon.attackRank - 1);

    // 相手の攻撃ランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(opponentPokemon.id, {
      attackRank: newAttackRank,
    });
  }

  // いかくは場に出すときのみ発動するため、他のメソッドは実装不要
}
