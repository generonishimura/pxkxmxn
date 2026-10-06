import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BaseVolatileMoveEffect } from './base/base-volatile-move-effect';

/**
 * みやぶる（Foresight）技の効果
 *
 * 相手に foresight を書く。相手が場にいる間、次のことが起きる（エンジンが判定する）。
 * - 相手の上がった回避ランクを 0 として扱う（下がった回避ランクはそのまま）
 * - ゴーストタイプの相手にノーマル・かくとう技が等倍で当たる
 *
 * 相手がすでに見破られているか、ミラクルアイを受けていれば失敗する（本家の onTryHit）。
 */
export class ForesightEffect extends BaseVolatileMoveEffect {
  protected readonly kind = 'foresight';
  protected readonly appliesTo = 'target';
  protected readonly successMessage = 'was identified!';

  protected createPatch(): StatePatch<VolatileState> {
    return { foresight: true };
  }

  protected failsBeforeApply(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
  ): boolean {
    return defender.volatileState.miracleEye === true;
  }
}
