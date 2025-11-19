import { BaseConditionalDamageEffect } from '../base/base-conditional-damage-effect';

/**
 * 「マルチスケイル」特性の効果実装
 *
 * 効果: HPが満タンの時、受けるダメージが半減する
 */
export class MultiscaleEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'hpFull' as const;
  protected readonly damageMultiplier = 0.5;
}

