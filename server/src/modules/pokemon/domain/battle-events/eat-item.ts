import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { ItemRegistry } from '../items/item-registry';
import { consumeItem, resolveItemName } from './item-lookup';

/**
 * きのみか（持ち物の効果が onEat を持つか。本家の isBerry）
 * @param itemName 持ち物の名前（持っていなければ undefined）
 */
export const isBerry = (itemName: string | undefined): boolean =>
  itemName !== undefined && ItemRegistry.get(itemName)?.onEat !== undefined;

/**
 * eatItem の結果を、きのみのフックが返すメッセージにする
 * @returns 食べなかった・メッセージがなければ null
 */
export const joinEatMessages = (messages: readonly string[] | undefined): string | null =>
  messages && messages.length > 0 ? messages.join(' ') : null;

/**
 * きのみを食べる（本家の eatItem）
 *
 * 1. 今効果のある持ち物（resolveItemName）がきのみでなければ食べない
 * 2. 持ち物を使い切る（consumeItem）
 * 3. きのみの onEat を呼ぶ
 *
 * 食べるきっかけ（HP が半分以下になった など）は見ない。きっかけは呼ぶ側（きのみの onUpdate など）で見る
 * @param holder 食べるポケモン（最新の状態）
 * @returns 食べたらメッセージの配列（何も起きなければ空）。食べなかったら undefined
 */
export const eatItem = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string[] | undefined> => {
  const itemName = resolveItemName(holder);
  const effect = itemName === undefined ? undefined : ItemRegistry.get(itemName);
  if (itemName === undefined || !effect?.onEat) {
    return undefined;
  }
  if ((await consumeItem(holder, battleContext)) === undefined) {
    return undefined;
  }
  const eaten =
    (await battleContext.battleRepository?.findBattlePokemonStatusById(holder.id)) ?? holder;
  const message = await effect.onEat(eaten, itemName, battleContext);
  return message ? [message] : [];
};
