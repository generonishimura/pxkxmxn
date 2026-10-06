import { BaseSelfHealEffect, HealFraction } from './base/base-self-heal-effect';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { modifyByFraction } from './base/modify-by-fraction';

/**
 * すなあつめ（Shore Up）技の効果
 *
 * 効果: 自分の HP を最大 HP の 1/2 回復する（HP が満タンのときは失敗）
 *
 * - すなあらしのときは最大 HP の 2/3 回復する
 *
 * 回復量は本家と同じく 4096 基準の補正値で計算する（2/3 は 0.667 として扱う）
 */
export class ShoreUpEffect extends BaseSelfHealEffect {
  protected computeHealAmount(maxHp: number, battleContext: BattleContext): number {
    return modifyByFraction(maxHp, this.getHealFraction(battleContext));
  }

  protected getHealFraction(battleContext: BattleContext): HealFraction {
    const weather = battleContext.weather ?? battleContext.battle.weather;
    if (weather === Weather.Sandstorm) {
      return { numerator: 667, denominator: 1000 };
    }
    return { numerator: 1, denominator: 2 };
  }
}
