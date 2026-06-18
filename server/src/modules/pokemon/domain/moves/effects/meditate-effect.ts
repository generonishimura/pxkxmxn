import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ヨガのポーズ」の特殊効果実装
 */
export class MeditateEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'attack';
  protected readonly rankChange = 1;
}
