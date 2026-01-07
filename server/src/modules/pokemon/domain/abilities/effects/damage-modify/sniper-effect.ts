import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * スナイパー（Sniper）特性の効果
 * 急所時のダメージを1.5倍→2.25倍に
 *
 * 注意: 急所時のダメージは通常1.5倍だが、この特性により2.25倍になる
 * 実装では、急所時のダメージに対して1.5倍を追加で適用する
 */
export class SniperEffect implements IAbilityEffect {
  /**
   * 急所時の追加倍率
   * 通常の急所倍率（1.5倍）に対して、さらに1.5倍を掛ける
   */
  private static readonly CRITICAL_HIT_MULTIPLIER = 1.5;

  /**
   * ダメージを与えるときに発動
   * 急所時、ダメージを1.5倍に
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 急所でない場合は修正しない
    if (!battleContext.isCriticalHit) {
      return undefined;
    }

    // 急所時のダメージに対して1.5倍を追加で適用
    // 通常の急所倍率（1.5倍）が既に適用されているため、
    // 追加で1.5倍を掛けることで、合計2.25倍になる
    return Math.floor(damage * SniperEffect.CRITICAL_HIT_MULTIPLIER);
  }
}
