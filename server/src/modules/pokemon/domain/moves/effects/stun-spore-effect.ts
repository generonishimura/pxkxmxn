import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「しびれごな」の特殊効果実装
 *
 * 効果: 必ず相手にまひを付与 (Paralyzes the target)
 * 制約: 粉技のためくさタイプには無効
 */
export class StunSporeEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 1.0;
  protected readonly immuneTypes = ['でんき', 'くさ'];
  protected readonly message = 'was paralyzed!';
}
