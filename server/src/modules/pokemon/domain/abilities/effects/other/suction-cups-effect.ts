import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * きゅうばん（Suction Cups）特性の効果
 * ほえる・ふきとばし・ドラゴンテール・ともえなげで交代させられない
 *
 * - ほえる・ふきとばしは失敗し、ドラゴンテール・ともえなげはダメージだけ与える（preventsForcedSwitch。エンジンが判定する）
 * - 相手の技なので、かたやぶりで無視される（エンジンが判定する）
 */
export class SuctionCupsEffect implements IAbilityEffect {
  readonly preventsForcedSwitch = true;
}
