import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/**
 * ふういん（Imprison）技の効果
 *
 * 使用者に imprison を書く。使用者が場にいる間、相手は使用者が覚えている技を
 * 選べず、出すこともできない（エンジンが技を選ぶとき・技を出す前に判定する）。
 * 相手が同じ技を覚えていなくても成功する（第 9 世代の本家と同じ）。
 * 使用者がすでにふういんを使っていれば失敗する。
 */
export class ImprisonEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'imprison';
  protected readonly appliesTo = 'user';
  protected readonly successMessage = 'sealed any moves its target shares with it!';

  protected createPatch(): StatePatch<VolatileState> {
    return { imprison: true };
  }
}
