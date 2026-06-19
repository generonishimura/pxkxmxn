import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「とぐろをまく」の特殊効果実装
 */
export class CoilEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'defense', rankChange: 1 },
    { statType: 'accuracy', rankChange: 1 },
  ];
}
