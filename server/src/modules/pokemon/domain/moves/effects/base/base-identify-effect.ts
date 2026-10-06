import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../../battle-events/volatile-infliction';
import { moveEffectSource } from './base-stat-change-effect';

/**
 * 相手をみやぶる状態（みやぶる・かぎわけるの foresight と、ミラクルアイの miracleEye）
 */
export type IdentifyKind = 'foresight' | 'miracleEye';

/**
 * 相手をみやぶる変化技の基底クラス（みやぶる・かぎわける・ミラクルアイ）
 *
 * 相手に foresight / miracleEye を書く。上がった回避ランクの無視と、タイプ相性 0 の解除はエンジンが行う。
 * 次のときは失敗する（本家と同じ）。
 * - 相手がすでに同じ状態（tryApplyVolatile が付与しない）
 * - 相手がもう一方の状態（foresight と miracleEye は重ねられない。本家の onTryHit）
 */
export abstract class BaseIdentifyEffect implements IMoveEffect {
  /**
   * 相手に書く状態
   */
  protected abstract readonly kind: IdentifyKind;

  shouldFail(_attacker: BattlePokemonStatus, defender: BattlePokemonStatus): boolean {
    const other: IdentifyKind = this.kind === 'foresight' ? 'miracleEye' : 'foresight';
    return defender.volatileState[other] === true;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const patch = this.kind === 'foresight' ? { foresight: true } : { miracleEye: true };
    const applied = await tryApplyVolatile(defender, this.kind, patch, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return applied ? 'was identified!' : 'But it failed';
  }
}
