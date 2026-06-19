import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ちいさくなる」の特殊効果実装
 */
export class MinimizeEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'evasion';
  protected readonly rankChange = 2;
}
