import { BaseContactStatusConditionEffect } from '../base/base-contact-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * もうふう（Flame Body）特性の効果
 * 接触技を受けたとき、30%の確率で相手をやけどにする
 */
export class FlameBodyEffect extends BaseContactStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.3;
  protected readonly immuneTypes = ['ほのお'] as const;
}

