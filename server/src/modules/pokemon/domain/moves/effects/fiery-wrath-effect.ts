import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * もえあがるいかり（Fiery Wrath）技の効果
 *
 * 効果: 20%の確率で相手をひるませる
 */
export class FieryWrathEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.2;
  protected readonly immuneTypes: string[] = []; // ひるみには免疫タイプがない
  protected readonly message = 'flinched!';
}
