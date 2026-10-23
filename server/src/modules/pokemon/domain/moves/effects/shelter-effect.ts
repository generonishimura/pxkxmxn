import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * たてこもる（Shelter）技の効果
 *
 * 効果: 自分の防御ランクを2段階上げる
 */
export class ShelterEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'defense';
  protected readonly rankChange = 2;
}
