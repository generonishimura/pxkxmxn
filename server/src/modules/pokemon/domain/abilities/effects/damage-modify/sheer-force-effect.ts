import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ちからずく（Sheer Force）特性の効果
 * 追加効果がある技の威力1.3倍（追加効果は発動しない）
 *
 * 注意: 追加効果の発動を無効化する処理は、技の特殊効果側で実装する必要がある
 */
export class SheerForceEffect implements IAbilityEffect {
  /**
   * ダメージ倍率
   */
  private static readonly DAMAGE_MULTIPLIER = 1.3;

  /**
   * ダメージを与えるときに発動
   * 追加効果がある技の場合、ダメージを1.3倍に
   */
  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (!battleContext) {
      return undefined;
    }

    // 追加効果がある技でない場合は修正しない
    if (!battleContext.hasSecondaryEffect) {
      return undefined;
    }

    // 追加効果がある技の場合、ダメージを1.3倍に
    return Math.floor(damage * SheerForceEffect.DAMAGE_MULTIPLIER);
  }
}
