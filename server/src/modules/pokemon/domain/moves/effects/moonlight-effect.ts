import { BaseWeatherSelfHealEffect } from './base/base-weather-self-heal-effect';

/**
 * つきのひかり（Moonlight）技の効果
 *
 * 効果: 自分の HP を天候に応じて回復する（HP が満タンのときは失敗）
 *
 * - にほんばれ: 最大 HP の 2/3
 * - 天候なし: 最大 HP の 1/2
 * - あめ・すなあらし・あられ: 最大 HP の 1/4
 */
export class MoonlightEffect extends BaseWeatherSelfHealEffect {}
