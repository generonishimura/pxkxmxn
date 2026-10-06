import { BaseSelfHealEffect, HealFraction } from './base/base-self-heal-effect';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';

/**
 * すなあつめ（Shore Up）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/2 回復する（HP が満タンのときは失敗）
 *
 * - すなあらしのときは最大 HP の 2/3 回復する
 */
export class ShoreUpEffect extends BaseSelfHealEffect {
  protected getHealFraction(battleContext: BattleContext): HealFraction {
    const weather = battleContext.weather ?? battleContext.battle.weather;
    if (weather === Weather.Sandstorm) {
      return { numerator: 2, denominator: 3 };
    }
    return { numerator: 1, denominator: 2 };
  }
}
