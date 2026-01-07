import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * まけんき（Defiant）特性の効果
 * 自分のステータスが下がったとき、攻撃を2段階上げる
 *
 * 注意: この特性は、自分のステータスが下がった瞬間に発動する必要がある。
 * 現在の実装では、ターン終了時に自分のステータスが下がっているかどうかを
 * チェックしているが、これは暫定的な実装である。
 * 将来的には、ステータスが下がった瞬間に発動するように修正する必要がある。
 */
export class DefiantEffect implements IAbilityEffect {
  /**
   * ターン終了時に発動
   * 自分のステータスが下がっている場合、攻撃を2段階上げる
   *
   * 注意: 本来は自分のステータスが下がった瞬間に発動する必要があるが、
   * 現在の実装ではターン終了時にチェックしている。
   * これは暫定的な実装であり、将来的には改善が必要である。
   */
  async onTurnEnd(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext?.battleRepository) {
      return;
    }

    // 自分のステータスが下がっているかチェック
    // 攻撃、防御、特攻、特防、素早さ、命中率、回避率のいずれかが負の値（下がっている）場合
    const hasStatDecrease =
      pokemon.attackRank < 0 ||
      pokemon.defenseRank < 0 ||
      pokemon.specialAttackRank < 0 ||
      pokemon.specialDefenseRank < 0 ||
      pokemon.speedRank < 0 ||
      pokemon.accuracyRank < 0 ||
      pokemon.evasionRank < 0;

    // 自分のステータスが下がっていない場合は処理しない
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
