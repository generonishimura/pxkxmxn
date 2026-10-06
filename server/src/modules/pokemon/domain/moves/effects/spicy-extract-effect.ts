import { BaseOpponentMultiStatChangeMoveEffect } from './base/base-opponent-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * ハバネロエキス（Spicy Extract）技の効果
 *
 * 効果: 相手の攻撃を 2 段階上げ、防御を 2 段階下げる
 *
 * 注: 基底クラスは相手の特性の canReceiveStatChange を参照しないため、
 *     クリアボディ等で防御の低下だけが防がれる本家の挙動は再現しない
 */
export class SpicyExtractEffect extends BaseOpponentMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 2 },
    { statType: 'defense', rankChange: -2 },
  ];
}
