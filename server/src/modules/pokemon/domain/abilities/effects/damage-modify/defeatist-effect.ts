import { BaseConditionalDamageDealtEffect } from '../base/base-conditional-damage-dealt-effect';

/**
 * よわき（Defeatist）特性の効果
 * HP が半分以下のとき、攻撃と特攻が半分になる
 *
 * 注: 攻撃・特攻の半減は、与えるダメージに 0.5 倍を掛けることで近似する
 */
export class DefeatistEffect extends BaseConditionalDamageDealtEffect {
  protected readonly conditionType = 'hpHalf' as const;
  protected readonly damageMultiplier = 0.5;
}
