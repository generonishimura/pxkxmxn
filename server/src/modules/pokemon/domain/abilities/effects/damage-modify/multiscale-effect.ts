import { BaseConditionalDamageEffect } from '../base/base-conditional-damage-effect';

/**
 * 「マルチスケイル」特性の効果実装
 * ファントムガード（Shadow Shield）特性も同じ効果のため、このクラスを共用する
 *
 * 効果: HPが満タンの時、受けるダメージが半減する
 *
 * 注: ファントムガードは本来かたやぶりで無視されないが、ここではダメージ計算が
 * 攻撃側のかたやぶりで防御側の特性をスキップするため、マルチスケイルと同じく無視される。
 */
export class MultiscaleEffect extends BaseConditionalDamageEffect {
  protected readonly conditionType = 'hpFull' as const;
  protected readonly damageMultiplier = 0.5;
}

