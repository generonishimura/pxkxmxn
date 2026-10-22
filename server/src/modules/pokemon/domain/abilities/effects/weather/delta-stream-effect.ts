import { BasePrimalWeatherEffect } from '../base/base-primal-weather-effect';

/**
 * デルタストリーム（Delta Stream）特性の効果
 * 場に出たとき、らんきりゅう（ゲンシ天候）にする。ひこうタイプへの効果ばつぐんの攻撃技を等倍にする
 * ふつうの天候は上書きし、ほかの天候にする技・特性は効かない。持ち主が場を離れると終わる
 * （等倍にする処理・天候の終わりはエンジンが行う）
 */
export class DeltaStreamEffect extends BasePrimalWeatherEffect {
  readonly primalWeather = 'strongWinds' as const;
}
