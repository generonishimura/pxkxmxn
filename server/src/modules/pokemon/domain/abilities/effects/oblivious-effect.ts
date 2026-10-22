import { IAbilityEffect } from '../ability-effect.interface';
import { BattleContext } from '../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { EffectSource } from '../../battle-events/effect-source';
import type { VolatileKind } from '../../battle-events/volatile-infliction';
import type { StatType } from '../../moves/effects/base/base-stat-change-effect';

/**
 * どんかんで受けない一時的な状態（メロメロ・ちょうはつ）
 */
const IMMUNE_VOLATILE_KINDS: ReadonlySet<VolatileKind> = new Set<VolatileKind>([
  'attract',
  'taunt',
]);

/**
 * どんかん（Oblivious）特性の効果
 * メロメロ・ちょうはつを受けない（canReceiveVolatile）。いかくで攻撃が下がらない（第 8 世代から）
 * 相手の技で付与されるときは、かたやぶりで無視される（canApplyVolatile が判定する）
 * 注: すでにメロメロ・ちょうはつの状態で、なかまづくりなどでどんかんになったときに解ける効果はない
 */
export class ObliviousEffect implements IAbilityEffect {
  canReceiveVolatile(
    _holder: BattlePokemonStatus,
    kind: VolatileKind,
    _battleContext?: BattleContext,
    _source?: EffectSource,
  ): boolean | undefined {
    return IMMUNE_VOLATILE_KINDS.has(kind) ? false : undefined;
  }

  canReceiveStatChange(
    _pokemon: BattlePokemonStatus,
    statType: StatType,
    rankChange: number,
    _battleContext?: BattleContext,
    source?: EffectSource,
  ): boolean | undefined {
    return source?.name === 'いかく' && statType === 'attack' && rankChange < 0 ? false : undefined;
  }
}
