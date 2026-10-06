import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * ほのお・みずタイプの技のタイプ名
 */
const TRIGGER_TYPE_NAMES: readonly string[] = ['ほのお', 'みず'];

/**
 * じょうききかん（Steam Engine）特性の効果
 * ほのお・みずタイプの攻撃技のダメージを受けるたびに、素早さを6段階上げる
 *
 * - 技のタイプはタイプ変更の反映後（hit.moveTypeName）で判定する
 * - 連続技ではヒットごとに発動する。ひんしになったときは発動しない（本家と同じ）
 * - かたやぶりでは無視されない（本家と同じ）
 */
export class SteamEngineEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || !TRIGGER_TYPE_NAMES.includes(hit.moveTypeName)) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'speed', rankChange: 6 }],
      battleContext,
      {
        source: {
          pokemon: holder,
          abilityName: 'じょうききかん',
          kind: 'ability',
          name: 'じょうききかん',
        },
      },
    );
    return joinStatChangeMessages(result);
  }
}
