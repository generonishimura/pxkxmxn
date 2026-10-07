import { IAbilityEffect } from '../../ability-effect.interface';

/**
 * ノーガード（No Guard）特性の効果
 * 自分が使う技も、自分が受ける技も必ず命中する（変化技・一撃必殺技を含む）。
 * そらをとぶ・あなをほるなどで隠れている相手・隠れている自分にも当たる
 *
 * 判定は AccuracyCalculator と MoveExecutorService が ensuresMoveHit を見て行う（かたやぶりでは無視されない）
 */
export class NoGuardEffect implements IAbilityEffect {
  readonly ensuresMoveHit = true;
}
