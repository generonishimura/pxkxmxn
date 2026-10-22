import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * 変化技を同じ優先度の中で最後に出すための、優先度に足す値（本家の onFractionalPriority）
 */
const MYCELIUM_MIGHT_FRACTIONAL_PRIORITY = -0.1;

/**
 * きんしのちから（Mycelium Might）特性の効果
 * 変化技を使うとき、同じ優先度の中で最後に行動し、相手の特性を無視する
 *
 * - 行動順の判定で、変化技なら modifyFractionalPriority が優先度に -0.1 を足す。
 *   1 未満なので優先度の違いは越えず、素早さを変えないので、トリックルームの間も後に行動する
 * - 変化技なら breaksMoldFor が true を返し、かたやぶりと同じく相手の特性を無視する
 * - 攻撃技では、どちらも起こらない
 */
export class MyceliumMightEffect implements IAbilityEffect {
  modifyFractionalPriority(
    _holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): number | undefined {
    return battleContext?.moveCategory === 'Status'
      ? MYCELIUM_MIGHT_FRACTIONAL_PRIORITY
      : undefined;
  }

  breaksMoldFor(battleContext?: BattleContext): boolean {
    return battleContext?.moveCategory === 'Status';
  }
}
