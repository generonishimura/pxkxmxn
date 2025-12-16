import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「すてみタックル」の特殊効果実装
 *
 * 効果: 与えたダメージの1/3を自分が受ける (1/3 recoil damage)
 */
export class DoubleEdgeEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 0.33;
  protected readonly message = '反動で{damage}ダメージを受けた';
}

