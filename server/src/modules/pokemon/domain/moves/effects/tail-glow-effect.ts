import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ほたるび」の特殊効果実装
 */
export class TailGlowEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = 3;
}
