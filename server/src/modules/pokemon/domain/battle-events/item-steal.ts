import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { heldItemName } from './item-lookup';
import { canGiveItem, giveItem, takeItem } from './item-transfer';

/**
 * 持ち物を持っていないポケモンが、相手の持ち物を奪う（わるいてぐせ・マジシャン。本家の takeItem → setItem）
 *
 * 次のときは何も書かずに undefined を返す
 * - 奪う側が持ち物を持っている・ひんし（本家の setItem は HP が 0 なら失敗し、持ち物を相手に戻す）
 * - 相手が持ち物を持っていない
 * - 相手の持ち物を奪う側に渡せない・相手から外せない（その種族のメガストーン、相手のねんちゃく。takeItem）
 * @param thief 奪うポケモン（最新の状態）
 * @param victim 奪われるポケモン（最新の状態）
 * @returns 奪った持ち物の名前
 */
export const stealItem = async (
  thief: BattlePokemonStatus,
  victim: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string | undefined> => {
  const itemName = heldItemName(victim);
  if (
    thief.id === victim.id ||
    heldItemName(thief) !== undefined ||
    itemName === undefined ||
    !(await canGiveItem(thief, itemName, battleContext))
  ) {
    return undefined;
  }
  const taken = await takeItem(victim, battleContext, { source: thief });
  if (taken === undefined) {
    return undefined;
  }
  const latestThief =
    (await battleContext.battleRepository?.findBattlePokemonStatusById(thief.id)) ?? thief;
  await giveItem(latestThief, taken, battleContext);
  return taken;
};
