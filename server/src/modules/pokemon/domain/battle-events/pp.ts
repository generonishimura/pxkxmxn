import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMoveSlot, resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * ポケモンの技の PP を減らす（うらみ・おんねん・プレッシャーなど）
 *
 * - ものまね・へんしんで入れ替わった技（volatileState.moveSlotOverrides）は、その PP を減らす
 * - 0 未満にはしない。覚えていない技なら何もしない
 *
 * @param pokemon 技を覚えているポケモン（最新の状態を渡す）
 * @param moveId PP を減らす技（Move の ID）
 * @param amount 減らす量（おんねんは残りの PP すべて）
 * @returns 実際に減らした PP
 */
export const reducePp = async (
  pokemon: BattlePokemonStatus,
  moveId: number,
  amount: number,
  battleContext: BattleContext,
): Promise<number> => {
  const repository = battleContext.battleRepository;
  if (!repository || amount <= 0) {
    return 0;
  }
  const moves = (await repository.findBattlePokemonMovesByBattlePokemonStatusId(pokemon.id)) ?? [];
  const slot = findMoveSlot(resolveMoveSlots(moves, pokemon.volatileState), moveId);
  if (!slot) {
    return 0;
  }
  const newPp = Math.max(0, slot.currentPp - amount);
  if (newPp === slot.currentPp) {
    return 0;
  }
  if (slot.isOverride) {
    await repository.patchVolatileState(pokemon.id, {
      moveSlotOverrides: (pokemon.volatileState.moveSlotOverrides ?? []).map(override =>
        override.battlePokemonMoveId === slot.battlePokemonMoveId
          ? { ...override, currentPp: newPp }
          : override,
      ),
    });
  } else {
    await repository.updateBattlePokemonMove(slot.battlePokemonMoveId, { currentPp: newPp });
  }
  return slot.currentPp - newPp;
};
