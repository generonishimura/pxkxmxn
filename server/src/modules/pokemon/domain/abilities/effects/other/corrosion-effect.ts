import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ふしょく（Corrosion）特性の効果
 * はがねタイプ・どくタイプの相手も、どく・もうどくにできる
 *
 * - タイプによる免疫だけを無視する。めんえきなどの特性や、粉技のくさタイプの免疫では防がれる
 * - canInflictStatus が付与元の特性として呼ぶ。変化技（どくどく）・技の追加効果・特性（どくしゅ）のどれにも効く
 * 注: どくのいと・サイコシフトは inflictStatus を通らないため、ふしょくでもはがね・どくタイプをどくにできない
 */
export class CorrosionEffect implements IAbilityEffect {
  bypassesStatusTypeImmunity(
    _holder: BattlePokemonStatus,
    statusCondition: StatusCondition,
  ): boolean {
    return (
      statusCondition === StatusCondition.Poison || statusCondition === StatusCondition.BadPoison
    );
  }
}
