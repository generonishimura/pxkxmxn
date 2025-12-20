import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * みずのベール（Water-veil）特性の効果
 * やけど無効化
 */
export class WaterVeilEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Burn] as const;
}
