import { BaseRecoilStatusConditionEffect } from './base/base-recoil-status-condition-effect';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「フレアドライブ」の特殊効果実装
 *
 * 効果: 10%の確率で相手にやけどを付与 (Has a 10% chance to burn the target)
 * 反動: 与えたダメージの33/100（BaseRecoilStatusConditionEffect）
 */
export class FlareBlitzEffect extends BaseRecoilStatusConditionEffect {
  protected readonly statusCondition = StatusCondition.Burn;
  protected readonly chance = 0.1;
  protected readonly immuneTypes = ['ほのお'];
  protected readonly message = 'was burned!';
}
