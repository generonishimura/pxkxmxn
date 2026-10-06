import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange } from '../../../battle-events/stat-change';

const INTIMIDATE_ABILITY_NAME = 'いかく';

/**
 * ばんけん（Guard Dog）特性の効果
 * いかくを受けたとき、攻撃が下がる代わりに1段階上がる
 *
 * - いかく以外による攻撃の低下（なきごえなど）は変えない
 * 注: 本家の「ふきとばし・ほえるなどで交代させられない」効果は、強制交代の仕組みがないため実装していない
 */
export class GuardDogEffect implements IAbilityEffect {
  modifyIncomingStatChange(
    _holder: BattlePokemonStatus,
    change: StatChange,
    source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): number | undefined {
    if (
      source?.kind === 'ability' &&
      source.name === INTIMIDATE_ABILITY_NAME &&
      change.statType === 'attack' &&
      change.rankChange < 0
    ) {
      return 1;
    }
    return undefined;
  }
}
