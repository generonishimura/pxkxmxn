import { BaseStatDropImmunityEffect } from '../base/base-stat-drop-immunity-effect';

/**
 * かいりきバサミ（Hyper Cutter）特性の効果
 * 攻撃ランクが下がらない
 */
export class HyperCutterEffect extends BaseStatDropImmunityEffect {
  protected readonly protectedStat = 'attack' as const;
}
