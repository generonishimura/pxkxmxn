import { BaseContactStatusConditionEffect } from '../base/base-contact-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * せいでんき（Static）特性の効果
 * 接触技を受けたとき、30%の確率で相手をまひにする
 */
export class StaticEffect extends BaseContactStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['でんき'] as const;
}

