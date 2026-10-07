import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/**
 * こころのめ（Mind Reader）・ロックオン（Lock-On）技の効果
 *
 * 使用者に lockOnTurns: 2 を書く。次のターンの終わりまで、使用者の技は必ず当たり、
 * そらをとぶ・あなをほるなどで隠れている相手にも届く（エンジンの AccuracyCalculator が判定する）。
 * 使ったターンの終わりに 1 減り、次のターンの終わりに消える（本家の lockon の duration 2 と同じ）。
 * 使用者がすでにねらいを定めていれば失敗する（本家の onTryHit）。
 *
 * 注: 本家はねらいを定めた相手にだけ必中になるが、lockOnTurns は相手を持たないため、
 *     相手が交代したあとに出てきたポケモンにも必中になる。
 */
export class LockOnEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'lockOn';
  protected readonly appliesTo = 'user';
  protected readonly successMessage = 'took aim at the target!';

  protected createPatch(): StatePatch<VolatileState> {
    return { lockOnTurns: 2 };
  }
}
