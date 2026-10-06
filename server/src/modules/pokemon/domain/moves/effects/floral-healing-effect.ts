import { BaseHealEffect, HealFraction, HealTarget } from './base/base-heal-effect';
import { modifyByFraction } from './base/modify-by-fraction';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';

/**
 * フラワーヒール（Floral Healing）技の効果
 *
 * 効果: 技の対象（シングルバトルでは相手）の HP を最大 HP の 1/2 回復する
 *
 * - グラスフィールドのときは最大 HP の 2/3 回復する
 *   本家と同じく 4096 基準の補正値で計算する（2/3 は 0.667 として扱う）
 * - 対象の HP が満タンの場合は失敗
 */
export class FloralHealingEffect extends BaseHealEffect {
  protected readonly healTarget: HealTarget = 'target';
  protected readonly healFraction: HealFraction = { numerator: 1, denominator: 2 };

  private static readonly GRASSY_TERRAIN_HEAL_FRACTION: HealFraction = {
    numerator: 667,
    denominator: 1000,
  };

  protected computeHealAmount(maxHp: number, battleContext: BattleContext): number {
    const field = battleContext.field ?? battleContext.battle.field;
    return field === Field.GrassyTerrain
      ? modifyByFraction(maxHp, FloralHealingEffect.GRASSY_TERRAIN_HEAL_FRACTION)
      : super.computeHealAmount(maxHp, battleContext);
  }
}
