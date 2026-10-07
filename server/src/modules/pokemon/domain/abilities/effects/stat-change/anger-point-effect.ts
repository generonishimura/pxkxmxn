import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * 攻撃ランクを最大にするための上昇量（-6 からでも +6 になる。本家の boost({ atk: 12 })）
 */
const ANGER_POINT_ATTACK_BOOST = 12;

/**
 * いかりのつぼ（Anger Point）特性の効果
 * 攻撃技の急所に当たると、攻撃ランクを最大の+6にする
 *
 * - 連続技ではヒットごとに判定する（急所に当たったヒットで発動する）
 * - ひんしになったヒットでは発動しない（本家と同じ）
 * - みがわりに当たったときは発動しない（エンジンが onDamagingHit を呼ばない）
 * - かたやぶりでは無視されない（本家と同じ）
 */
export class AngerPointEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !hit.isCriticalHit || hit.targetFainted) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'attack', rankChange: ANGER_POINT_ATTACK_BOOST }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'いかりのつぼ' } },
    );
    return joinStatChangeMessages(result);
  }
}
