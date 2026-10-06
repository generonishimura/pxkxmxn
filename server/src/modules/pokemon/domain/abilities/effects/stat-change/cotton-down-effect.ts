import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * わたげ（Cotton Down）特性の効果
 * 攻撃技のダメージを受けるたびに、攻撃してきた相手の素早さを1段階下げる
 *
 * - 連続技ではヒットごとに発動する。自分がひんしになったヒットでも発動する（本家と同じ）
 * - 相手のクリアボディ・ミラーアーマーなどは applyStatChanges が判定する
 * - かたやぶりでは無視されない（本家と同じ）
 */
export class CottonDownEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      attacker,
      [{ statType: 'speed', rankChange: -1 }],
      battleContext,
      { source: { pokemon: holder, abilityName: 'わたげ', kind: 'ability', name: 'わたげ' } },
    );
    return joinStatChangeMessages(result);
  }
}
