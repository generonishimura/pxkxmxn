import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「とっしん」の特殊効果実装
 *
 * 効果: 与えたダメージの1/4を自分が受ける (1/4 recoil damage)
 */
export class TakeDownEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 0.25;
  protected readonly message = '反動で{damage}ダメージを受けた';
}

