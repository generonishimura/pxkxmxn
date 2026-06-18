import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ドわすれ」の特殊効果実装
 */
export class AmnesiaEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialDefense';
  protected readonly rankChange = 2;
}
