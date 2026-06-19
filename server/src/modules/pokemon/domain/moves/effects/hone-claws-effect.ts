import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「つめとぎ」の特殊効果実装
 */
export class HoneClawsEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'accuracy', rankChange: 1 },
  ];
}
