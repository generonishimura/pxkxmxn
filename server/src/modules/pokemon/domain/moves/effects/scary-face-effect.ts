import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「こわいかお」の特殊効果実装
 */
export class ScaryFaceEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'speed';
  protected readonly rankChange = -2;
}
