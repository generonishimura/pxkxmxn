import { BasePrimalWeatherEffect } from '../base/base-primal-weather-effect';

/**
 * はじまりのうみ（Primordial Sea）特性の効果
 * 場に出たとき、おおあめ（ゲンシ天候）にする。雨として扱い、ほのおの攻撃技は失敗する
 * ふつうの天候は上書きし、ほかの天候にする技・特性は効かない。持ち主が場を離れると終わる
 * （失敗判定・天候の終わりはエンジンが行う）
 */
export class PrimordialSeaEffect extends BasePrimalWeatherEffect {
  readonly primalWeather = 'heavyRain' as const;
}
