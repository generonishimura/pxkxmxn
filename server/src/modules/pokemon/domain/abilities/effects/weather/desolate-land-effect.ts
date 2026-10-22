import { BasePrimalWeatherEffect } from '../base/base-primal-weather-effect';

/**
 * おわりのだいち（Desolate Land）特性の効果
 * 場に出たとき、おおひでり（ゲンシ天候）にする。晴れとして扱い、みずの攻撃技は失敗する
 * ふつうの天候は上書きし、ほかの天候にする技・特性は効かない。持ち主が場を離れると終わる
 * （失敗判定・天候の終わりはエンジンが行う）
 */
export class DesolateLandEffect extends BasePrimalWeatherEffect {
  readonly primalWeather = 'harshSunlight' as const;
}
