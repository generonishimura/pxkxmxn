import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「ウッドハンマー」の特殊効果実装
 *
 * 効果: 与えたダメージの1/3を反動として受ける
 */
export class WoodHammerEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 1 / 3;
  protected readonly message = '反動で{damage}ダメージを受けた';
}
