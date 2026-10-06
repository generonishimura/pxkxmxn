import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * しょうりのまい（Victory Dance）技の効果
 *
 * 効果: 自分の攻撃・防御・素早さを 1 段階ずつ上げる
 */
export class VictoryDanceEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'defense', rankChange: 1 },
    { statType: 'speed', rankChange: 1 },
  ];
}
