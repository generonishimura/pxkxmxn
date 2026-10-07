import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/**
 * メロメロ（Attract）技の効果
 *
 * 相手に infatuatedWithStatusId（使用者の ID）を書く。相手は技を出そうとするたびに
 * 50% で動けなくなる（エンジンの BeforeMoveChecker が判定する）。使用者が場を離れると解ける。
 *
 * 次のときは失敗する（tryApplyVolatile が判定する）。
 * - 使用者と相手の性別が同じか、どちらかが性別不明
 * - 相手がすでにメロメロ
 * - 相手の特性が どんかん・アロマベール（かたやぶりなら無視する）
 *
 * 注: あかいいと（持ち物）で使用者もメロメロにする効果はない。
 */
export class AttractEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'attract';
  protected readonly appliesTo = 'target';
  protected readonly successMessage = 'fell in love!';

  protected createPatch(attacker: BattlePokemonStatus): StatePatch<VolatileState> {
    return { infatuatedWithStatusId: attacker.id };
  }
}
