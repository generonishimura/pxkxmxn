import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ちょうのまい」の特殊効果実装
 */
export class QuiverDanceEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'specialAttack', rankChange: 1 },
    { statType: 'specialDefense', rankChange: 1 },
    { statType: 'speed', rankChange: 1 },
  ];
}
