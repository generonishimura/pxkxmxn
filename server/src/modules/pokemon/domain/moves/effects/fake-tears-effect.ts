import { BaseOpponentStatChangeMoveEffect } from './base/base-opponent-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * 「うそなき」の特殊効果実装
 */
export class FakeTearsEffect extends BaseOpponentStatChangeMoveEffect {
  protected readonly statType: StatType = 'specialDefense';
  protected readonly rankChange = -2;
}
