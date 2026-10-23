import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';

/**
 * こだわりスカーフ（Choice Scarf）
 * 素早さが 1.5 倍になる。最初に出した技（わるあがきを除く）しか出せなくなる
 *
 * - 技の固定と、固定された技以外を出せなくするのはエンジン（locksMoveChoice → choiceLockedMoveId。交代で解ける）
 * - 素早さは、行動順を決めるときに特性の補正のあとで掛ける（ActionOrderDeterminerService）
 * 注: 本家は、持ち物がなくなる（はたきおとす・トリックなど）とこだわりが解ける。ここでは交代するまで解けない
 */
export class ChoiceScarfEffect implements IItemEffect {
  readonly locksMoveChoice = true;

  modifySpeed(_pokemon: BattlePokemonStatus, speed: number): number {
    return Math.floor(speed * 1.5);
  }
}
