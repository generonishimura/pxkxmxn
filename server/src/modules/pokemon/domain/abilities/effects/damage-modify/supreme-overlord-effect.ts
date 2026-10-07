import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * そうだいしょう（Supreme Overlord）特性の効果
 * 手持ちがひんしになった延べ数（最大 5）に応じて、技の威力を 1 匹につき 1.1 倍ずつ上げる
 * （4096 分率で 4506・4915・5325・5734・6144。さいきのいのりで復活しても数は減らない）
 *
 * 注: 本家は場に出たときの数を覚えておくが、ここでは技を出すたびにエンジンが数えた値を使う。
 * シングルバトルでは場にいる間に数が変わらないので同じ結果になる
 */
export class SupremeOverlordEffect implements IAbilityEffect {
  /**
   * ひんしの数ごとの威力の補正（4096 分率。添字がひんしの数）
   */
  private static readonly POWER_MODIFIERS = [4096, 4506, 4915, 5325, 5734, 6144] as const;

  /**
   * 数える上限
   */
  private static readonly MAX_FALLEN = 5;

  modifyBasePower(
    _pokemon: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const fallen = Math.min(
      SupremeOverlordEffect.MAX_FALLEN,
      battleContext?.attackerFaintedAllyCount ?? 0,
    );
    if (fallen <= 0) {
      return undefined;
    }
    return modifyByFixedPoint(power, SupremeOverlordEffect.POWER_MODIFIERS[fallen]);
  }
}
