import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/**
 * いちゃもん（Torment）技の効果
 *
 * 相手に torment を書く。相手は場にいる間、直前に出した技（わるあがきを除く）を
 * 続けて選べなくなる（エンジンが技を選ぶときに判定する）。
 * 相手がすでにいちゃもんをつけられているか、特性が アロマベール なら失敗する。
 */
export class TormentEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'torment';
  protected readonly appliesTo = 'target';
  protected readonly successMessage = 'was subjected to torment!';

  protected createPatch(): StatePatch<VolatileState> {
    return { torment: true };
  }
}
