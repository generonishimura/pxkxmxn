import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「スプーンまげ」の特殊効果実装
 */
export class KinesisEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'accuracy';
  protected readonly rankChange = -1;
}
