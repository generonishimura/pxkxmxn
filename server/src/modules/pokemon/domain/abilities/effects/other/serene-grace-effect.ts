import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * てんのめぐみ（Serene Grace）特性の効果
 * 自分の技の追加効果の発動確率が2倍になる（相手への追加効果・自分への追加効果の両方）
 *
 * 追加効果は rollSecondaryEffect で判定するので、エンジンが secondaryEffectChanceMultiplier を確率に掛ける
 */
export class SereneGraceEffect implements IAbilityEffect {
  readonly secondaryEffectChanceMultiplier = 2;
}
