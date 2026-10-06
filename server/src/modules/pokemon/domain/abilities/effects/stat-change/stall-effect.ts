import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * あとだし（Stall）特性の効果
 * 同じ優先度の技を出し合ったとき、必ず最後に行動する
 *
 * 行動順の判定（`action-order-determiner`）は優先度が同じときだけ `modifySpeed` を参照するため、
 * 素早さを 0 にすることで同じ優先度の中で最後に行動させる。
 *
 * 注: 素早さ 0 として近似している。相手も素早さ 0（同じ特性など）の場合は、通常の同速判定で行動順が決まる。
 */
export class StallEffect implements IAbilityEffect {
  modifySpeed(
    _pokemon: BattlePokemonStatus,
    _speed: number,
    _battleContext?: BattleContext,
  ): number | undefined {
    return 0;
  }
}
