import { BaseStatusConditionEffect } from './base-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「こおりのキバ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にひるみを付与、10%の確率でこおりを付与
 * 注意: 本実装ではひるみのみを実装（こおりは別途実装が必要）
 */
export class IceFangEffect extends BaseStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Flinch;
  protected readonly chance = 0.1;
  protected readonly immuneTypes: string[] = []; // ひるみには免疫タイプがない
  protected readonly message = 'flinched!';
}

