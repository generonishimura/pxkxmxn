import { BaseRecoilStatusConditionEffect } from './base/base-recoil-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ボルテッカー」の特殊効果実装
 *
 * 効果: 10%の確率で相手にまひを付与 (Has a 10% chance to paralyze the target)
 * 反動: 与えたダメージの33/100（BaseRecoilStatusConditionEffect）
 */
export class VoltTackleEffect extends BaseRecoilStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Paralysis;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['でんき'];
  protected readonly message = 'was paralyzed!';
}
