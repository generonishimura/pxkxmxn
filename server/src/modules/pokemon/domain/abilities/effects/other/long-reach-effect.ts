import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import type { MoveFlag } from '@/modules/pokemon/domain/moves/move-flags';

/**
 * えんかく（Long Reach）特性の効果
 * 自分の技から接触（技フラグ contact）を外す
 *
 * 接触時の特性（せいでんき・さめはだ・ほうしなど）は isContactMove で判定するので、相手のこれらの特性が発動しなくなる
 */
export class LongReachEffect implements IAbilityEffect {
  modifyMoveFlags(
    _pokemon: BattlePokemonStatus,
    flags: ReadonlySet<MoveFlag>,
  ): ReadonlySet<MoveFlag> {
    return new Set([...flags].filter(flag => flag !== 'contact'));
  }
}
