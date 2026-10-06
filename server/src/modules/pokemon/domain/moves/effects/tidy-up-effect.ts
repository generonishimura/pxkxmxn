import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * おかたづけ（Tidy Up）技の効果
 *
 * 効果: 自分の攻撃・素早さを 1 段階ずつ上げる
 *
 * 注: 本家ではまきびし等の設置技とみがわりも取り除くが、エンジンに設置技とみがわりが
 *     まだ無いため、能力上昇のみを実装している
 */
export class TidyUpEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'speed', rankChange: 1 },
  ];
}
