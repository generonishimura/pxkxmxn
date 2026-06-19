import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「はめつのひかり」の特殊効果実装
 *
 * 効果: 与えたダメージの1/2を反動として受ける (User receives 1/2 the damage inflicted in recoil)
 */
export class LightOfRuinEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 1 / 2;
  protected readonly message = '反動で{damage}ダメージを受けた';
}
