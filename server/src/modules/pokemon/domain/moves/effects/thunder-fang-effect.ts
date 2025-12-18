import {
  BaseMultipleStatusConditionEffect,
  StatusConditionConfig,
} from './base-multiple-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「かみなりのキバ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にひるみを付与、10%の確率でまひを付与
 * それぞれ独立に確率判定を行い、最初に成功したものを付与
 */
export class ThunderFangEffect extends BaseMultipleStatusConditionEffect {
  protected readonly statusConditions: readonly StatusConditionConfig[] = [
    {
      statusCondition: StatusCondition.Flinch,
      chance: 0.1,
      immuneTypes: [], // ひるみには免疫タイプがない
      message: 'flinched!',
    },
    {
      statusCondition: StatusCondition.Paralysis,
      chance: 0.1,
      immuneTypes: ['でんき'],
      message: 'is paralyzed! It may be unable to move!',
    },
  ];
}

