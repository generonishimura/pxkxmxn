import { BaseTypeImmunityEffect } from './base-type-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * タイプ吸収の基底クラス
 * 特定のタイプの技を無効化し、HPを回復する汎用的な実装
 *
 * 各特性は、このクラスを継承して無効化するタイプと回復量を設定するだけで実装できる
 */
export abstract class BaseTypeAbsorbEffect extends BaseTypeImmunityEffect {
  /**
   * HP回復量（最大HPに対する割合、例: 0.25は最大HPの1/4）
   */
  protected abstract readonly healRatio: number;

  /**
   * ダメージを受けた後に発動
   * タイプ無効化が発動した場合、HPを回復
   */
  async onAfterTakingDamage(
    pokemon: BattlePokemonStatus,
    originalDamage: number,
    battleContext?: BattleContext,
  ): Promise<void> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext?.battleRepository) {
      return;
    }

    // 技のタイプ情報がない場合は処理しない
    if (!battleContext.moveTypeName) {
      return;
    }

    // タイプ無効化が発動しているかチェック
    const isImmune = this.isImmuneToType(pokemon, battleContext.moveTypeName, battleContext);
    if (!isImmune) {
      return;
    }

    // HP回復量を計算（最大HPに対する割合）
    const healAmount = Math.floor(pokemon.maxHp * this.healRatio);

    // 現在のHPを取得（最新の状態を取得するため）
    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(pokemon.id);
    if (!currentStatus) {
      return;
    }

    // HP回復（最大HPを超えないように）
    const newHp = Math.min(currentStatus.maxHp, currentStatus.currentHp + healAmount);

    // HPを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      currentHp: newHp,
    });
  }
}

