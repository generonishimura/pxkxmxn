import { BaseSelfStatChangeMoveEffect } from './base/base-self-stat-change-move-effect';

/**
 * 「かたくなる」の特殊効果実装
 *
 * 効果: 自分の防御ランク+1
 */
export class HardenEffect extends BaseSelfStatChangeMoveEffect {
  protected readonly statType = 'defense' as const;
  protected readonly rankChange = 1;
}

