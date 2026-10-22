import { FilterEffect } from './filter-effect';

/**
 * プリズムアーマー（Prism Armor）特性の効果
 * 効果ばつぐん（タイプ相性が1倍より大きい）の技で受けるダメージを0.75倍にする
 *
 * - ダメージの補正はフィルター・ハードロックと同じ
 * - フィルター・ハードロックと違い、かたやぶりで無視されない
 */
export class PrismArmorEffect extends FilterEffect {
  readonly unaffectedByMoldBreaker = true;
}
