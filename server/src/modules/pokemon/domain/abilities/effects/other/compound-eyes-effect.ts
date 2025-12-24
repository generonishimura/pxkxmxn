import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ふくがん（Compound Eyes）特性の効果
 * 命中率を1.3倍にする
 */
export class CompoundEyesEffect implements IAbilityEffect {
  private static readonly ACCURACY_MULTIPLIER = 1.3;

  /**
   * 命中率を修正
   * @param pokemon 対象のポケモン
   * @param accuracy 現在の命中率（0-100）
   * @param battleContext バトルコンテキスト
   * @returns 修正後の命中率（1.3倍）
   */
  modifyAccuracy(
    pokemon: BattlePokemonStatus,
    accuracy: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    // 命中率を1.3倍にする（上限100）
    return Math.min(100, Math.floor(accuracy * CompoundEyesEffect.ACCURACY_MULTIPLIER));
  }
}
