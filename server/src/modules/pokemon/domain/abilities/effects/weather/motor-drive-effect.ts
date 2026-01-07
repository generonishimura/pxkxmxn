import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { BaseTypeImmunityEffect } from '../base/base-type-immunity-effect';

/**
 * でんきエンジン（Motor Drive）特性の効果
 * でんきタイプの技を無効化し、その技を受けて無効化したときに素早さを1段階上げる
 */
export class MotorDriveEffect extends BaseTypeImmunityEffect {
  protected readonly immuneTypes = ['でんき'] as const;

  /**
   * ダメージを受けた後に発動
   * タイプ無効化が発動した場合、素早さを1段階上げる
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

    // 技のタイプ情報がない場合は処理しない
    if (!battleContext.moveTypeName) {
      return;
    }

    // タイプ無効化が発動しているかチェック
    const isImmune = this.isImmuneToType(pokemon, battleContext.moveTypeName, battleContext);
    if (!isImmune) {
      return;
    }

    // 現在のステータスを取得（最新の状態を取得するため）
    const currentStatus = await battleContext.battleRepository.findBattlePokemonStatusById(pokemon.id);
    if (!currentStatus) {
      return;
    }

    // 現在の素早さランクを取得
    const currentSpeedRank = currentStatus.speedRank;

    // 新しいランクを計算（-6から+6の範囲内で）
    const newSpeedRank = Math.max(-6, Math.min(6, currentSpeedRank + 1));

    // 素早さランクを更新
    await battleContext.battleRepository.updateBattlePokemonStatus(pokemon.id, {
      speedRank: newSpeedRank,
    });
  }
}
