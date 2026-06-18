import { BaseOpponentMultiStatChangeMoveEffect } from './base/base-opponent-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「なみだめ」の特殊効果実装
 */
export class TearfulLookEffect extends BaseOpponentMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: -1 },
    { statType: 'specialAttack', rankChange: -1 },
  ];
}
