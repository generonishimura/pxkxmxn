import { BaseTypeImmunityWithStatBoostEffect } from '../base/base-type-immunity-with-stat-boost-effect';
import { StatType } from '../base/base-stat-boost-effect';

/**
 * よびみず（Storm Drain）特性の効果
 * みずタイプの技を無効化し、特攻を1段階上げる
 */
export class StormDrainEffect extends BaseTypeImmunityWithStatBoostEffect {
  protected readonly immuneTypes = ['みず'] as const;
  protected readonly boostStat: StatType = 'specialAttack';
}
