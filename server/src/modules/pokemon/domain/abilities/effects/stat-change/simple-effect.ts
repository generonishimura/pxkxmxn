import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange } from '../../../battle-events/stat-change';

/**
 * たんじゅん（Simple）特性の効果
 * 自分の能力ランクが変わるとき、変化量が2倍になる（自分で起こした変化も、相手が起こした変化も）
 *
 * - 2倍にしたあとで -6〜+6 に収める
 * - 相手の技による変化では、使い手のかたやぶりで無視される
 * 注: はらだいこ・ほおばるなど、applyStatChanges を通らずにランクを直接書く効果には効かない
 */
export class SimpleEffect implements IAbilityEffect {
  modifyIncomingStatChange(
    _holder: BattlePokemonStatus,
    change: StatChange,
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): number | undefined {
    return change.rankChange * 2;
  }
}
