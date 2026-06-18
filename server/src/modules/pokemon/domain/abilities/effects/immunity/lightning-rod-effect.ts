import { BaseTypeImmunityWithStatBoostEffect } from '../base/base-type-immunity-with-stat-boost-effect';
import { StatType } from '../base/base-stat-boost-effect';

/**
 * ひらいしん（Lightning Rod）特性の効果
 * でんきタイプの技を無効化し、特攻を1段階上げる
 */
export class LightningRodEffect extends BaseTypeImmunityWithStatBoostEffect {
  protected readonly immuneTypes = ['でんき'] as const;
  protected readonly boostStat: StatType = 'specialAttack';
}
