import { BaseChargeOnHitEffect } from '../base/base-charge-on-hit-effect';

/**
 * でんきにかえる（Electromorphosis）特性の効果
 * 技でダメージを受けるたびに、じゅうでん状態になる（次のでんき技の威力が 2 倍。エンジンが行う）
 */
export class ElectromorphosisEffect extends BaseChargeOnHitEffect {
  protected readonly abilityName = 'でんきにかえる';

  protected chargesOn(): boolean {
    return true;
  }
}
