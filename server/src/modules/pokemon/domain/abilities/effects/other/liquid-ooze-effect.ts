import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ヘドロえき（Liquid Ooze）特性の効果
 * HPを吸い取られたとき、吸い取った相手を回復させず、回復するはずだった量のダメージを与える
 *
 * - applyDrainHeal で回復する効果に効く（今はちからをすいとる・ゆめくい）
 * - 注: ギガドレインなど、ほかの吸い取る技はまだ applyDrainHeal を使っていないので、今は効かない
 * - かたやぶりでは無視されない。相手がマジックガードならダメージを受けない（本家と同じ）
 */
export class LiquidOozeEffect implements IAbilityEffect {
  readonly reversesDrainHeal = true;
}
