import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「ゆうわく」の特殊効果実装
 *
 * 効果: 相手の特攻を 2 段階下げる
 * 注: 本家では「異性の相手のみ」の条件があるが、性別情報のモデリングが
 *     未整備のため、本実装では性別を問わず適用する
 */
export class CaptivateEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialAttack';
  protected readonly rankChange = -2;
}
