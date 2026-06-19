import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「わたほうし」の特殊効果実装
 */
export class CottonSporeEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'speed';
  protected readonly rankChange = -2;
}
