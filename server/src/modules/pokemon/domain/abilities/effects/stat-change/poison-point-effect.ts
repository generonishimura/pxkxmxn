import { BaseContactStatusConditionEffect } from '../base/base-contact-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * どくどく（Poison Point）特性の効果
 * 接触技を受けたとき、30%の確率で相手をどくにする
 */
export class PoisonPointEffect extends BaseContactStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Poison;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['どく', 'はがね'] as const;
}

