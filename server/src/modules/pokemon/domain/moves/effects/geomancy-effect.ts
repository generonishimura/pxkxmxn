import { BaseSelfMultiStatChangeMoveEffect } from './base/base-self-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * ジオコントロール（Geomancy）技の効果
 * 1 ターン目はためるだけで、2 ターン目に自分の特攻・特防・素早さを 2 段階ずつ上げる。
 * ためるのはエンジンが行う（MoveBehaviors の charge）。2 ターン目は選んだ行動にかかわらず出し、PP は減らない
 *
 * 注: パワフルハーブでためずに出す処理は、持ち物の仕組みがないので行わない
 */
export class GeomancyEffect extends BaseSelfMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'specialAttack', rankChange: 2 },
    { statType: 'specialDefense', rankChange: 2 },
    { statType: 'speed', rankChange: 2 },
  ];
}
