import { BaseRecoilEffect } from './base/base-recoil-effect';

/**
 * 「ワイルドボルト」の特殊効果実装
 *
 * 効果: 与えたダメージの1/4を反動として受ける
 */
export class WildChargeEffect extends BaseRecoilEffect {
  protected readonly recoilRatio = 1 / 4;
  protected readonly message = '反動で{damage}ダメージを受けた';
}
