import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * がんじょう（Sturdy）特性の効果
 * HP満タン時、一撃必殺技以外のダメージでHPが1残る
 */
export class SturdyEffect implements IAbilityEffect {
  /**
   * ダメージを受けるときに発動
   * HP満タン時、一撃必殺技以外のダメージでHPが1残る
   */
  modifyDamage(
    pokemon: BattlePokemonStatus,
    damage: number,
    _battleContext?: BattleContext,
  ): number {
    // HPが満タンでない場合は修正しない
    if (pokemon.currentHp < pokemon.maxHp) {
      return damage;
    }

    // 一撃必殺技の判定
    // 現時点では、一撃必殺技であるかどうかを判定する情報がBattleContextに存在しないため、
    // 将来的に BattleContext に「isOneHitKO（仮称）」のような一撃必殺技フラグを追加し、
    // このメソッドの第3引数 battleContext からそのフラグを参照してがんじょう効果の適用可否を判定する必要がある。
    // 現時点では、すべてのダメージに対して効果を発動する
    // TODO: BattleContext に一撃必殺技判定用フラグを追加し、battleContext.isOneHitKO が true の場合は本ダメージ補正処理をスキップする条件分岐を実装する

    // HP満タン時、ダメージが最大HP以上の場合、HPを1残すようにダメージを調整
    if (damage >= pokemon.maxHp) {
      return pokemon.maxHp - 1;
    }

    // ダメージが最大HP未満の場合は修正しない
    return damage;
  }
}
