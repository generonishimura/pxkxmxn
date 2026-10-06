import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * フラワーヒール（Floral Healing）技の効果
 *
 * 効果: 技の対象（シングルバトルでは相手）の HP を最大 HP の 1/2 回復する
 *
 * - グラスフィールドのときは最大 HP の 2/3 回復する
 * - 対象の HP が満タンの場合は失敗
 */
export class FloralHealingEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'target';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 2 };

  private static readonly GRASSY_TERRAIN_HEAL_FRACTION: HealFraction = {
    numerator: 2,
    denominator: 3,
  };

  protected getHealFraction(battleContext: BattleContext): HealFraction {
    const field = battleContext.field ?? battleContext.battle.field;
    return field === Field.GrassyTerrain
      ? FloralHealingEffect.GRASSY_TERRAIN_HEAL_FRACTION
      : this.healFraction;
  }
}
