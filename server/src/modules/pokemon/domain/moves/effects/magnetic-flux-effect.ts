import { BasePlusMinusSelfStatBoostEffect } from './base/base-plus-minus-self-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * じばそうさ（Magnetic Flux）技の効果
 *
 * 効果: 特性がプラスまたはマイナスのポケモンの防御と特防を1段階ずつ上げる
 *       シングルバトルでは対象は自分だけで、自分の特性がプラス・マイナス以外なら失敗する
 */
export class MagneticFluxEffect extends BasePlusMinusSelfStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'defense', rankChange: 1 },
    { statType: 'specialDefense', rankChange: 1 },
  ];
}
