import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * みずがため（Water Compaction）特性の効果
 * みずタイプの攻撃技のダメージを受けるたびに、防御を2段階上げる
 *
 * - タイプはタイプ変更（うるおいボイスなど）の反映後で判定する
 * - 連続技ではヒットごとに上げる（本家と同じ）。ひんしになったヒットでは上げない
 */
export class WaterCompactionEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveTypeName !== 'みず') {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'defense', rankChange: 2 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'みずがため' } },
    );
    return joinStatChangeMessages(result);
  }
}
