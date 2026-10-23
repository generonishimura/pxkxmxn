import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { heldItemName } from '../../../battle-events/item-lookup';

/**
 * かるわざ（Unburden）特性の効果
 * 場にいる間に持ち物を失うと、持ち物を持っていない間、素早さが 2 倍になる（本家の unburden）
 *
 * - onItemLost: 持ち物を使い切った（きのみ・ふうせん・ジュエルなど）・奪われた・手放した・入れ替えで渡したときに、
 *   volatileState.unburden を書く（ひんしなら書かない）
 * - modifySpeed: unburden があり、持ち物を持っていなければ 2 倍（さしおさえで効果が消えた持ち物も「持っている」とみなす）
 * - 交代すると消える。特性が変わると消える（ABILITY_STATE_KEYS。本家の onEnd）
 */
export class UnburdenEffect implements IAbilityEffect {
  private static readonly SPEED_MULTIPLIER = 2;

  modifySpeed(pokemon: BattlePokemonStatus, speed: number): number | undefined {
    if (pokemon.volatileState.unburden !== true || heldItemName(pokemon) !== undefined) {
      return undefined;
    }
    return speed * UnburdenEffect.SPEED_MULTIPLIER;
  }

  async onItemLost(
    holder: BattlePokemonStatus,
    _itemName: string,
    battleContext: BattleContext,
  ): Promise<void> {
    if (holder.currentHp <= 0 || holder.volatileState.unburden === true) {
      return;
    }
    await battleContext.battleRepository?.patchVolatileState(holder.id, { unburden: true });
  }
}
