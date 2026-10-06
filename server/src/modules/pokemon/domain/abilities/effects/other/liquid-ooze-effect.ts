import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ヘドロえき（Liquid Ooze）特性の効果
 * HPを吸い取られたとき、吸い取った相手を回復させず、回復するはずだった量のダメージを与える
 *
 * - ゆめくい・ちからをすいとるなど、applyDrainHeal で回復する効果すべてに効く
 * - かたやぶりでは無視されない。相手がマジックガードならダメージを受けない（本家と同じ）
 */
export class LiquidOozeEffect implements IAbilityEffect {
  readonly reversesDrainHeal = true;
}
