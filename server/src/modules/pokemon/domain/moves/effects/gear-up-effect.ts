import { BasePlusMinusSelfStatBoostEffect } from './base/base-plus-minus-self-stat-boost-effect';
import { StatType } from './base/base-stat-change-effect';

/**
 * アシストギア（Gear Up）技の効果
 *
 * 効果: 特性がプラスまたはマイナスのポケモンの攻撃と特攻を1段階ずつ上げる
 *       シングルバトルでは対象は自分だけで、自分の特性がプラス・マイナス以外なら失敗する
 */
export class GearUpEffect extends BasePlusMinusSelfStatBoostEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: 1 },
    { statType: 'specialAttack', rankChange: 1 },
  ];
}
