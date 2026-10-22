import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { addEntryHazard } from '../../../battle-events/field-state';

/**
 * どくげしょう（Toxic Debris）特性の効果
 * 物理技のダメージを受けるたびに、攻撃した相手の陣営にどくびしを 1 層置く（2 層まで）
 *
 * - 自分がひんしになったヒットでも発動する（本家と同じ）
 * - 連続技はヒットごとに判定する。2 層あれば何もしない
 * - みがわりに当たったときは発動しない（エンジンが onDamagingHit を呼ばない）
 */
export class ToxicDebrisEffect implements IAbilityEffect {
  async onDamagingHit(
    _holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveCategory !== 'Physical') {
      return null;
    }
    const placed = await addEntryHazard(battleContext, attacker.trainerId, 'toxicSpikes');
    return placed
      ? 'Poison spikes were scattered on the ground all around the opposing team!'
      : null;
  }
}
