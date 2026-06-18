import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ないしょばなし」の特殊効果実装
 */
export class ConfideEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = -1;
}
