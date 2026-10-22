import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * ソウルハート（Soul-Heart）特性の効果
 * ポケモンがひんしになるたびに、特攻を1段階上げる
 *
 * 注: 本家は場のどのポケモンがひんしになっても発動するが、ここでは自分の技で相手をひんしにしたとき
 *     （onKnockOut）だけ発動する。反動・状態異常・さめはだなど、技以外で相手が倒れたときは発動しない
 */
export class SoulHeartEffect implements IAbilityEffect {
  async onKnockOut(
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
