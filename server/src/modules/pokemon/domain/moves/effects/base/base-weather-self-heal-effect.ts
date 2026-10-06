import { BaseSelfHealEffect, HealFraction } from './base-self-heal-effect';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * 天候によって回復量が変わる回復技の基底クラス
 *
 * 効果: 自分の HP を天候に応じて回復する
 *
 * - にほんばれ: 最大 HP の 2/3
 * - 天候なし: 最大 HP の 1/2
 * - あめ・すなあらし・あられ: 最大 HP の 1/4
 */
export abstract class BaseWeatherSelfHealEffect extends BaseSelfHealEffect {
  protected getHealFraction(battleContext: BattleContext): HealFraction {
    const weather = battleContext.weather ?? battleContext.battle.weather;

    switch (weather) {
      case Weather.Sun:
        return { numerator: 2, denominator: 3 };
      case Weather.Rain:
      case Weather.Sandstorm:
      case Weather.Hail:
        return { numerator: 1, denominator: 4 };
      default:
        return { numerator: 1, denominator: 2 };
    }
  }
}
