import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「いやなおと」の特殊効果実装
 */
export class ScreechEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'defense';
  protected readonly rankChange = -2;
}
