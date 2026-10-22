import { BaseStatusConditionImmunityEffect } from '../base/base-status-condition-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { isIgnoredByMoldBreaker } from '../../../battle-events/ability-lookup';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * ねつこうかん（Thermal Exchange）特性の効果
 * ほのおタイプの技でダメージを受けたヒットのたびに、攻撃を1段階上げる。やけどにならない
 *
 * - 攻撃が上がる部分は、相手のかたやぶりで無視される（本家と同じ）
 * - ひんしになったヒットでは攻撃を上げない
 */
export class ThermalExchangeEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Burn] as const;

  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveTypeName !== 'ほのお' || holder.currentHp <= 0) {
      return null;
    }
    if (await isIgnoredByMoldBreaker(battleContext.attackerAbilityName, 'ねつこうかん')) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'attack', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'ねつこうかん' } },
    );
    return joinStatChangeMessages(result);
  }
}
