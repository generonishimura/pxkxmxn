import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

type StatType =
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'accuracy'
  | 'evasion';

/**
 * はとむね（Big Pecks）特性の効果
 * 防御ランクが下がらない
 *
 * `canReceiveStatChange` フックで、防御ランクを下げようとする能力変化を無効化する。
 * `BaseOpponentStatChangeMoveEffect` 等の能力変化を適用する側で本フックが参照される。
 */
export class BigPecksEffect implements IAbilityEffect {
  canReceiveStatChange(
    _pokemon: BattlePokemonStatus,
    statType: StatType,
    rankChange: number,
    _battleContext?: BattleContext,
  ): boolean | undefined {
    if (statType === 'defense' && rankChange < 0) {
      return false;
    }
    return undefined;
  }
}
