import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * いろめがね（Tinted Lens）特性の効果
 * 効果いまひとつ（タイプ相性が0より大きく1倍より小さい）の技で与えるダメージを2倍にする
 * （4096分率で 8192、本家と同じ丸め）
 *
 * - 効果がない技（相性0）は2倍にしない
 */
export class TintedLensEffect implements IAbilityEffect {
  /**
   * 効果いまひとつのダメージ倍率（4096分率で 2倍）
   */
  private static readonly NOT_VERY_EFFECTIVE_DAMAGE_MODIFIER = 8192;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    const effectiveness = battleContext?.typeEffectiveness;
    if (effectiveness === undefined || effectiveness <= 0 || effectiveness >= 1) {
      return damage;
    }
    return modifyByFixedPoint(damage, TintedLensEffect.NOT_VERY_EFFECTIVE_DAMAGE_MODIFIER);
  }
}
