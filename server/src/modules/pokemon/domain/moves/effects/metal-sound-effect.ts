import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「きんぞくおん」の特殊効果実装
 */
export class MetalSoundEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialDefense';
  protected readonly rankChange = -2;
}
