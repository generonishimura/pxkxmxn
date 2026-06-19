import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ボディパージ」の特殊効果実装
 */
export class AutotomizeEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'speed';
  protected readonly rankChange = 2;
}
