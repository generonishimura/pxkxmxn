import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { EffectSource } from '../../../battle-events/effect-source';
import type { VolatileKind } from '../../../battle-events/volatile-infliction';

/**
 * アロマベールで受けない一時的な状態（本家の attract・disable・encore・healblock・taunt・torment）
 */
const BLOCKED_VOLATILE_KINDS: ReadonlySet<VolatileKind> = new Set<VolatileKind>([
  'attract',
  'disable',
  'encore',
  'healBlock',
  'taunt',
  'torment',
]);

/**
 * アロマベール（Aroma Veil）特性の効果
 * メロメロ・かなしばり・アンコール・かいふくふうじ・ちょうはつ・いちゃもんを受けない（canReceiveVolatile）。
 * 技だけでなく、のろわれボディのかなしばりも防ぐ。
 * 相手の技で付与されるときは、かたやぶりで無視される（canApplyVolatile が判定する）
 *
 * 注: 味方も守る効果はダブルバトル用なので、シングルバトルでは自分だけを守る
 */
export class AromaVeilEffect implements IAbilityEffect {
  canReceiveVolatile(
    _holder: BattlePokemonStatus,
    kind: VolatileKind,
    _battleContext?: BattleContext,
    _source?: EffectSource,
  ): boolean | undefined {
    return BLOCKED_VOLATILE_KINDS.has(kind) ? false : undefined;
  }
}
