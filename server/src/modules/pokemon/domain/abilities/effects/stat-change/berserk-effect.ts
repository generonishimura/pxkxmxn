import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ぎゃくじょう（Berserk）特性の効果
 * HPが半分以下になったとき、特攻を1段階上げる
 *
 * 注意: この特性は、ダメージ適用後にHPが半分以下になったかどうかをチェックする必要がある。
 * 現在の実装では、`onAfterTakingDamage`メソッドを使用して、ダメージ適用後にHPチェックとステータス更新を行う。
 * ただし、`onAfterTakingDamage`はタイプ無効化が発動した場合にのみ呼び出されるため、
 * 通常のダメージを受けた場合には呼び出されない。
 * 将来的には、通常のダメージを受けた場合にも`onAfterTakingDamage`が呼び出されるようにする必要がある。
 */
export class BerserkEffect implements IAbilityEffect {
  /**
   * HP閾値（半分以下）
   */
  private static readonly HP_THRESHOLD_RATIO = 0.5;

  /**
   * ダメージを受けた後に発動
   * HPが半分以下になった場合、特攻を1段階上げる
   */
  async onAfterTakingDamage(
    pokemon: BattlePokemonStatus,
    _originalDamage: number,
    battleContext?: BattleContext,
  ): Promise<void> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext?.battleRepository) {
      return;
    }

    // 現在のステータスを取得（最新の状態を取得するため）
    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(pokemon.id);
    if (!currentStatus) {
      return;
    }

    // HPが半分以下になったかチェック
    const hpRatio = currentStatus.currentHp / currentStatus.maxHp;
    if (hpRatio > BerserkEffect.HP_THRESHOLD_RATIO) {
      return;
    }

    // 現在の特攻ランクを取得
    const currentSpecialAttackRank = currentStatus.specialAttackRank;

    // 新しいランクを計算（-6から+6の範囲内で）
    const newSpecialAttackRank = Math.max(-6, Math.min(6, currentSpecialAttackRank + 1));

    // ランクが変化する場合のみ更新
    if (newSpecialAttackRank !== currentSpecialAttackRank) {
      // 特攻ランクを更新
      await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
        specialAttackRank: newSpecialAttackRank,
      });
    }
  }
}
