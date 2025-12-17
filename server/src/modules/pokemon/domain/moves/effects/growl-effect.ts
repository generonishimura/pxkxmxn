import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';

/**
 * 「なきごえ」の特殊効果実装
 *
 * 効果: 相手の攻撃ランク-1
 */
export class GrowlEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = -1;
}

