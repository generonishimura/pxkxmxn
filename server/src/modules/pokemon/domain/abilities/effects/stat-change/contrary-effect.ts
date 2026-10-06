import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { EffectSource } from '../../../battle-events/effect-source';
import { StatChange } from '../../../battle-events/stat-change';

/**
 * あまのじゃく（Contrary）特性の効果
 * 自分の能力ランクが変わるとき、上がる変化は下がり、下がる変化は上がる（自分で起こした変化も、相手が起こした変化も）
 *
 * - 逆にしたあとの変化で、クリアボディなどの「相手による低下」の判定をする
 * - 相手の技による変化では、使い手のかたやぶりで無視される
 * 注: はらだいこ・ほおばるなど、applyStatChanges を通らずにランクを直接書く効果には効かない
 */
export class ContraryEffect implements IAbilityEffect {
  modifyIncomingStatChange(
    _holder: BattlePokemonStatus,
    change: StatChange,
    _source: EffectSource | undefined,
    _battleContext?: BattleContext,
  ): number | undefined {
    return -change.rankChange;
  }
}
