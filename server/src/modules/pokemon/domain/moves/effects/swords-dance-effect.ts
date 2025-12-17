import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';

/**
 * 「つるぎのまい」の特殊効果実装
 *
 * 効果: 自分の攻撃ランク+2
 */
export class SwordsDanceEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType = 'attack' as const;
  protected readonly rankChange = 2;
}

