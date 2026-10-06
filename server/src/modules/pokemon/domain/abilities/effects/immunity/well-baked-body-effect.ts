import { BaseTypeImmunityWithStatBoostEffect } from '../base/base-type-immunity-with-stat-boost-effect';
import { StatType } from '../base/base-stat-boost-effect';

/**
 * こんがりボディ（Well-Baked Body）特性の効果
 * ほのおタイプの技を無効化し、防御を 2 段階上げる
 *
 * 注: タイプ無効化はダメージ計算でのみ判定されるため、おにびなどのほのおタイプの変化技は防げない
 */
export class WellBakedBodyEffect extends BaseTypeImmunityWithStatBoostEffect {
  protected readonly immuneTypes = ['ほのお'] as const;
  protected readonly boostStat: StatType = 'defense';
  protected readonly rankIncrease = 2;
}
