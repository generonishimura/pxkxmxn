import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ぼうぎょしれい」の特殊効果実装
 */
export class DefendOrderEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'defense', rankChange: 1 },
    { statType: 'specialDefense', rankChange: 1 },
  ];
}
