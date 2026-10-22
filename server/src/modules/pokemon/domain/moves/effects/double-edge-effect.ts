import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「すてみタックル」の特殊効果実装
 *
 * 効果: 与えたダメージの33%（四捨五入、最低1）を反動として受ける（本家の「1/3」は 33/100 で計算する）
 */
export class DoubleEdgeEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 33 / 100;
  protected readonly message = '反動で{damage}ダメージを受けた';
}
