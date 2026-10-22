import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * せいぎのこころ（Justified）特性の効果
 * あくタイプの技でダメージを受けたとき、攻撃を1段階上げる
 *
 * - ヒットごとに判定する（連続技ではヒットのたびに上がる）
 * - ひんしになったときは上がらない。かたやぶりでは無視されない（本家と同じ）
 */
export class JustifiedEffect implements IAbilityEffect {
  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveTypeName !== 'あく' || holder.currentHp <= 0) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'attack', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'せいぎのこころ' } },
    );
    return joinStatChangeMessages(result);
  }
}
