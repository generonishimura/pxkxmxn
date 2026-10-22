import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * 同じ優先度の中で最後に動かすための、優先度に足す値（本家の onFractionalPriority）
 */
const STALL_FRACTIONAL_PRIORITY = -0.1;

/**
 * あとだし（Stall）特性の効果
 * 同じ優先度の技を出し合ったとき、最後に行動する
 *
 * 行動順の判定（`ActionOrderDeterminerService`）で、`modifyFractionalPriority` が優先度に -0.1 を足す。
 * 1 未満なので優先度の違いは越えず、素早さを変えないので、トリックルームの間も最後に行動する。
 * 相手も同じだけ補正されたとき（同じ特性など）は、通常の素早さの判定で行動順が決まる。
 */
export class StallEffect implements IAbilityEffect {
  modifyFractionalPriority(
    _holder: BattlePokemonStatus,
    _battleContext?: BattleContext,
  ): number | undefined {
    return STALL_FRACTIONAL_PRIORITY;
  }
}
