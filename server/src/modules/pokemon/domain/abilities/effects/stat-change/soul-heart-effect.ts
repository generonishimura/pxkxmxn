import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * ソウルハート（Soul-Heart）特性の効果
 * 場のポケモンがひんしになるたびに、特攻を1段階上げる（本家の onAnyFaint）
 *
 * ひんしの原因（自分の技・反動・どく・接触特性など）と陣営は問わない。
 * エンジンが新しくひんしになったポケモンごとに onAnyFaint を呼ぶ（notifyFaint）
 */
export class SoulHeartEffect implements IAbilityEffect {
  async onAnyFaint(
    holder: BattlePokemonStatus,
    _fainted: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'specialAttack', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'ソウルハート' } },
    );
    return joinStatChangeMessages(result);
  }
}
