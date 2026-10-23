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
  if (amount <= 0) {
    return 0;
  }
  const changed = await changePp(pokemon, moveId, -amount, battleContext);
  return changed === 0 ? 0 : -changed;
};

/**
 * ポケモンの技の PP を回復する（ヒメリのみ など）
 *
 * - ものまね・へんしんで入れ替わった技（volatileState.moveSlotOverrides）は、その PP を回復する
 * - 最大 PP を超えては回復しない。覚えていない技なら何もしない
 *
 * @param pokemon 技を覚えているポケモン（最新の状態を渡す）
 * @param moveId PP を回復する技（Move の ID）
 * @param amount 回復する量
 * @returns 実際に回復した PP
 */
export const restorePp = async (
  pokemon: BattlePokemonStatus,
  moveId: number,
  amount: number,
  battleContext: BattleContext,
): Promise<number> => {
  if (amount <= 0) {
    return 0;
  }
  return changePp(pokemon, moveId, amount, battleContext);
};

/**
 * 技の PP を 0〜最大 PP の範囲で変えて書き込む
 * @returns 実際に変えた量（減らしたら負の値）
 */
const changePp = async (
  pokemon: BattlePokemonStatus,
  moveId: number,
  delta: number,
  battleContext: BattleContext,
): Promise<number> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return 0;
  }
  const moves = (await repository.findBattlePokemonMovesByBattlePokemonStatusId(pokemon.id)) ?? [];
  const slot = findMoveSlot(resolveMoveSlots(moves, pokemon.volatileState), moveId);
  if (!slot) {
    return 0;
  }
  const newPp = Math.max(0, Math.min(slot.maxPp, slot.currentPp + delta));
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
  return newPp - slot.currentPp;
};
