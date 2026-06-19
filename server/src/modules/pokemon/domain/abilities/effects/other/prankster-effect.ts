import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * いたずらごころ（Prankster）特性の効果
 * 変化技の優先度を +1 する
 */
export class PranksterEffect implements IAbilityEffect {
  modifyPriority(
    _pokemon: BattlePokemonStatus,
    movePriority: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveCategory !== 'Status') {
      return undefined;
    }
    return movePriority + 1;
  }
}
