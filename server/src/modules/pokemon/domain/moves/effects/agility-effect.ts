import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「こうそくいどう」の特殊効果実装
 */
export class AgilityEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'speed';
  protected readonly rankChange = 2;
}
