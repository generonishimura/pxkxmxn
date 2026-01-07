import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * まけんき（Defiant）特性の効果
 * 相手にステータスが下がったとき、攻撃を2段階上げる
 *
 * 注意: この特性は、ターン終了時に相手のステータスが下がっているかどうかを
 * チェックする必要がある。現在の実装では、ターン終了時にこの特性をチェックする。
 */
export class DefiantEffect implements IAbilityEffect {
  /**
   * ターン終了時に発動
   * 相手のステータスが下がっている場合、攻撃を2段階上げる
   */
  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    // バトルリポジトリがない場合は処理しない
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

    // 相手のステータスが下がっているかチェック
    // 攻撃、防御、特攻、特防、素早さ、命中率、回避率のいずれかが負の値（下がっている）場合
    const hasStatDecrease =
      opponentPokemon.attackRank < 0 ||
      opponentPokemon.defenseRank < 0 ||
      opponentPokemon.specialAttackRank < 0 ||
      opponentPokemon.specialDefenseRank < 0 ||
      opponentPokemon.speedRank < 0 ||
      opponentPokemon.accuracyRank < 0 ||
      opponentPokemon.evasionRank < 0;

    // 相手のステータスが下がっていない場合は処理しない
    if (!hasStatDecrease) {
      return;
    }

    // 現在の攻撃ランクを取得
    const currentAttackRank = pokemon.attackRank;

    // 新しいランクを計算（-6から+6の範囲内で）
    const newAttackRank = Math.max(-6, Math.min(6, currentAttackRank + 2));

    // ランクが変化しない場合は処理しない
    if (newAttackRank === currentAttackRank) {
      return;
    }

    // 攻撃ランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      attackRank: newAttackRank,
    });
  }
}
