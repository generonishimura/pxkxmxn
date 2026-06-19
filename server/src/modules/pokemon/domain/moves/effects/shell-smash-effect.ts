import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「からをやぶる」の特殊効果実装
 */
export class ShellSmashEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 2 },
    { statType: 'specialAttack', rankChange: 2 },
    { statType: 'speed', rankChange: 2 },
    { statType: 'defense', rankChange: -1 },
    { statType: 'specialDefense', rankChange: -1 },
  ];
}
