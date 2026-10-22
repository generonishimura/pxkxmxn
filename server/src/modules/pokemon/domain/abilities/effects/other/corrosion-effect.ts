import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ふしょく（Corrosion）特性の効果
 * はがねタイプ・どくタイプの相手も、どく・もうどくにできる
 *
 * - タイプによる免疫だけを無視する。めんえきなどの特性や、粉技のくさタイプの免疫では防がれる
 * - 持ち主の技（変化技のどくどく・どくのいと、攻撃技の追加効果）で canInflictStatus を通るものに効く。
 *   canInflictStatus が付与元の特性として呼ぶ
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
