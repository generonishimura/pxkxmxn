import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * しょうりのほし（Victory Star）特性の効果
 * 自分の技の命中率を1.1倍にする
 *
 * 注: 味方の命中率も上げる効果はダブルバトル専用のため扱わない。
 */
export class VictoryStarEffect implements IAbilityEffect {
  private static readonly ACCURACY_MULTIPLIER = 1.1;

  /**
   * 命中率を修正
   * @param _pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param _battleContext バトルコンテキスト
   * @returns 修正後の命中率（1.1倍、上限100）
   */
  modifyAccuracy(
    _pokemon: BattlePokemonStatus,
    accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    return Math.min(100, Math.floor(accuracy * VictoryStarEffect.ACCURACY_MULTIPLIER));
  }
}
