import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange, applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

const OPPORTUNIST_ABILITY_NAME = 'びんじょう';

/**
 * びんじょう（Opportunist）特性の効果
 * 相手の能力ランクが上がったとき、自分も同じ能力を同じだけ上げる
 *
 * - 相手のランクが実際に上がった量（+6 で止まった分は除く）だけ写す。下がった分は写さない
 * - びんじょうで写した上昇は、相手がびんじょうでも写し返さない
 * 注: 本家は相手の行動の終わりにまとめて写すが、ここでは相手のランクが上がるたびにすぐ写す
 * 注: 場に出たとき・ターン終了時に相手が自分で上げた変化（ふとうのけん・かそくなど）では、相手がわからないため写さない
 */
export class OpportunistEffect implements IAbilityEffect {
  async onOpponentStatChanged(
    holder: BattlePokemonStatus,
    _opponent: BattlePokemonStatus,
    applied: readonly StatChange[],
    source: EffectSource | undefined,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const boosts = applied.filter(change => change.rankChange > 0);
    if (!battleContext || boosts.length === 0 || source?.name === OPPORTUNIST_ABILITY_NAME) {
      return null;
    }

    const result = await applyStatChanges(holder, boosts, battleContext, {
      source: { pokemon: holder, kind: 'ability', name: OPPORTUNIST_ABILITY_NAME },
    });
    return joinStatChangeMessages(result);
  }
}
