import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * じゅくせい（Ripen）特性の効果
 * 自分が食べたきのみの効果が 2 倍になる（本家の onTryHeal・onSourceModifyDamage）
 *
 * - オボンのみは最大 HP の 1/2、オレンのみは 20 回復する
 * - 半減きのみは、ダメージを 1/4 にする
 * - 状態異常を治すきのみ・ヒメリのみは変わらない（本家と同じ）
 * - きのみの側が berryEffectMultiplier（battle-events/eat-item.ts）で倍率を引く
 * 注: 食べたときの「じゅくせい」の表示はしない
 */
export class RipenEffect implements IAbilityEffect {
  readonly doublesBerryEffects = true;
}
