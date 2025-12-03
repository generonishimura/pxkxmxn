import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「エアスラッシュ」の特殊効果実装
 *
 * 効果: 30%の確率で相手にひるみを付与 (30% chance to cause flinch)
 */
export class AirSlashEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.3;
  protected readonly immuneTypes: string[] = []; // ひるみには免疫タイプがない
  protected readonly message = 'flinched!';
}

