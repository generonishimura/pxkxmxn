import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * じきゅうりょく（Stamina）特性の効果
 * 攻撃技のダメージを受けるたびに、防御を1段階上げる
 *
 * - 連続技ではヒットごとに上げる（本家と同じ）。上げた防御は次のヒットのダメージ計算に使われる
 * - ひんしになったヒットでは上げない
 */
export class StaminaEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    _hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'defense', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'じきゅうりょく' } },
    );
    return joinStatChangeMessages(result);
  }
}
