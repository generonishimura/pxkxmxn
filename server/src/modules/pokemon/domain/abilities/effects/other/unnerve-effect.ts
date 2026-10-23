import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * きんちょうかん（Unnerve）特性の効果
 * 場にいる間、相手のポケモンはきのみを食べられない（本家の onFoeTryEatItem）
 *
 * - 判定は eatItem（battle-events/eat-item.ts の isBerryEatingPrevented）が行う。かたやぶりでは無視されない
 * - ひんし・控え・いえき・かがくへんかガスで特性が効いていなければ、相手はきのみを食べられる
 * 注: 場に出たときの「きんちょうして きのみが 食べられなくなった」の表示はしない（onEntry はメッセージを返せない）
 */
export class UnnerveEffect implements IAbilityEffect {
  readonly preventsFoeBerries = true;
}
