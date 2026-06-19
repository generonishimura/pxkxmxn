import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「どくのこな」の特殊効果実装
 *
 * 効果: 必ず相手にどくを付与 (Poisons the target)
 * 制約: 粉技のためくさタイプには無効
 */
export class PoisonPowderEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['どく', 'はがね', 'くさ'];
  protected readonly message = 'was poisoned!';
}
