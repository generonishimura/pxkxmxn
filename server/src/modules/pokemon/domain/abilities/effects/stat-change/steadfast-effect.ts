import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * ふくつのこころ（Steadfast）特性の効果
 * ひるんで技を出せなかったとき、素早さを1段階上げる
 */
export class SteadfastEffect implements IAbilityEffect {
  async onFlinch(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [{ statType: 'speed', rankChange: 1 }],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'ふくつのこころ' } },
    );
    return joinStatChangeMessages(result);
  }
}
