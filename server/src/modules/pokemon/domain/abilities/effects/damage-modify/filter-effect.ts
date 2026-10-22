import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';

/**
 * フィルター（Filter）特性の効果
 * ハードロック（Solid Rock）特性も同じ効果のため、このクラスを共用する
 *
 * 効果: 効果ばつぐん（タイプ相性が1倍より大きい）の技で受けるダメージを0.75倍にする
 * （4096分率で 3072、本家と同じ丸め）
 *
 * - かたやぶりで無視される（エンジンが判定する）
 *
 * 注: エンジンは攻撃側と防御側のダメージ補正を別々に丸め、天候補正をこの補正のあとに掛ける。
 *     本家は補正を掛け合わせてから1回だけ丸め、天候補正は先に掛けるため、ダメージが1ずれることがある
 */
export class FilterEffect implements IAbilityEffect {
  /**
   * 効果ばつぐんのダメージ倍率（4096分率で 0.75倍）
   */
  private static readonly SUPER_EFFECTIVE_DAMAGE_MODIFIER = 3072;

  modifyDamage(
    _pokemon: BattlePokemonStatus,
    damage: number,
    battleContext?: BattleContext,
  ): number {
    const effectiveness = battleContext?.typeEffectiveness;
    if (effectiveness === undefined || effectiveness <= 1) {
      return damage;
    }
    return modifyByFixedPoint(damage, FilterEffect.SUPER_EFFECTIVE_DAMAGE_MODIFIER);
  }
}
