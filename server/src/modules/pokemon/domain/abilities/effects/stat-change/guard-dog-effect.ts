import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange } from '../../../battle-events/stat-change';

const INTIMIDATE_ABILITY_NAME = 'いかく';

/**
 * 能力ランクの下限
 */
const MIN_RANK = -6;

/**
 * ばんけん（Guard Dog）特性の効果
 * いかくを受けたとき、攻撃が下がる代わりに1段階上がる。ほえる・ふきとばし・ドラゴンテールなどで交代させられない
 *
 * - いかく以外による攻撃の低下（なきごえなど）は変えない
 * - 攻撃ランクがすでに-6なら上げない（本家は下がる量を上限で切ってから判定するので、下がる量0で発動しない）
 * - 交代させられないのは preventsForcedSwitch（エンジンが判定する。かたやぶりで無視される）
 */
export class GuardDogEffect implements IAbilityEffect {
  readonly preventsForcedSwitch = true;

  modifyIncomingStatChange(
    holder: BattlePokemonStatus,
    change: StatChange,
    source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): number | undefined {
    if (
      source?.kind === 'ability' &&
      source.name === INTIMIDATE_ABILITY_NAME &&
      change.statType === 'attack' &&
      change.rankChange < 0 &&
      holder.attackRank > MIN_RANK
    ) {
      return 1;
    }
    return undefined;
  }
}
