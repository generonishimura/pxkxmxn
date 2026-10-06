import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * ブレインフォース（Neuroforce）特性の効果
 * 効果ばつぐん（タイプ相性が1倍より大きい）の技で与えるダメージを1.25倍にする
 * （4096分率で 5120、本家と同じ丸め）
 *
 * 注: エンジンは攻撃側と防御側のダメージ補正を別々に丸め、天候補正をこの補正のあとに掛ける。
 *     本家は補正を掛け合わせてから1回だけ丸め、天候補正は先に掛けるため、ダメージが1ずれることがある
 */
export class NeuroforceEffect implements IAbilityEffect {
  /**
   * 効果ばつぐんのダメージ倍率（4096分率で 1.25倍）
   */
  private static readonly SUPER_EFFECTIVE_DAMAGE_MODIFIER = 5120;

  modifyDamageDealt(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    const effectiveness = battleContext?.typeEffectiveness;
    if (effectiveness === undefined || effectiveness <= 1) {
      return damage;
    }
    return modifyByFixedPoint(damage, NeuroforceEffect.SUPER_EFFECTIVE_DAMAGE_MODIFIER);
  }
}
