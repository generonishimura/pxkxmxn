import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/** さしおさえのターン数（本家の duration） */
const EMBARGO_TURNS = 5;

/**
 * さしおさえ（Embargo）技の効果
 *
 * 相手を 5 ターンさしおさえ状態にする（embargoTurns）。その間、相手の持ち物の効果はなくなる
 * （resolveItemName・getItemEffect が持ち物を返さない。isItemSuppressed）。
 * - すでにさしおさえされている相手には失敗する（tryApplyVolatile が判定する）
 * - 持ち物は消えない。トリックなどで入れ替えることはできる
 * - バトンタッチで引き継ぐ。マジックコート・マジックミラーではね返る（MoveBehaviors の reflectable）
 */
export class EmbargoEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'embargo';
  protected readonly appliesTo = 'target';
  protected readonly successMessage = "can't use items anymore!";

  protected createPatch(): StatePatch<VolatileState> {
    return { embargoTurns: EMBARGO_TURNS };
  }
}
