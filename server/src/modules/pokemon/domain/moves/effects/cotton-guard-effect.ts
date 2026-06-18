import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「コットンガード」の特殊効果実装
 */
export class CottonGuardEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'defense';
  protected readonly rankChange = 3;
}
