import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「すなかけ」の特殊効果実装
 */
export class SandAttackEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'accuracy';
  protected readonly rankChange = -1;
}
