import { BaseOpponentMultiStatChangeMoveEffect } from './base/base-opponent-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * デコレーション（Decorate）技の効果
 *
 * 対象の攻撃と特攻のランクをそれぞれ 2 段階上げる（上限は +6）。
 * 第 8 世代以降は隣のポケモンなら誰でも対象にできるため、
 * シングルバトルでは相手のランクが上がる。
 */
export class DecorateEffect extends BaseOpponentMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 2 },
    { statType: 'specialAttack', rankChange: 2 },
  ];
}
