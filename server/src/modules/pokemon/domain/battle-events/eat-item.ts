import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { ItemRegistry } from '../items/item-registry';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';
import { consumeItem, resolveItemName } from './item-lookup';

/**
 * きのみか（持ち物の効果が onEat を持つか。本家の isBerry）
 * @param itemName 持ち物の名前（持っていなければ undefined）
 */
export const isBerry = (itemName: string | undefined): boolean =>
  itemName !== undefined && ItemRegistry.get(itemName)?.onEat !== undefined;

/**
 * 相手の特性で、きのみを食べられないか（きんちょうかん・じんばいったい。本家の onFoeTryEatItem）
 * 食べるポケモンと別のトレーナーの、場にいてひんしでないポケモンの実効の特性の preventsFoeBerries を見る
 * @param holder きのみを食べるポケモン
 */
export const isBerryEatingPrevented = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  const statuses =
    (await battleContext.battleRepository?.findBattlePokemonStatusByBattleId(holder.battleId)) ??
    [];
  for (const other of statuses) {
    if (!other.isActive || other.isFainted() || other.trainerId === holder.trainerId) {
      continue;
    }
    const effect = await getAbilityEffect(await resolveAbilityName(other, battleContext));
    if (effect?.preventsFoeBerries === true) {
      return true;
    }
  }
  return false;
};

/**
 * 食べたきのみの効果の倍率（じゅくせいなら 2、ほかは 1）
 * 回復するきのみの回復量と、半減きのみのダメージの減り方に掛ける
 * @param holder きのみを食べたポケモン
 */
export const berryEffectMultiplier = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<number> => {
  const effect = await getAbilityEffect(await resolveAbilityName(holder, battleContext));
  return effect?.doublesBerryEffects === true ? 2 : 1;
};

/**
 * HP が最大 HP の 1/4 以下で食べるきのみ（本家の pinch berry）を、今食べる HP か
 * くいしんぼう（eatsPinchBerriesEarly）なら 1/2 以下で食べる。ひんしなら false
 * 注: チャンピオンズの持ち物には、HP 1/4 以下で食べるきのみがない。そのきのみを足すときに使う
 */
export const isPinchBerryHp = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (holder.currentHp <= 0) {
    return false;
  }
  if (holder.currentHp <= holder.maxHp / 4) {
    return true;
  }
  const effect = await getAbilityEffect(await resolveAbilityName(holder, battleContext));
  return effect?.eatsPinchBerriesEarly === true && holder.currentHp <= holder.maxHp / 2;
};

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
 * 2. 相手のきんちょうかん・じんばいったい（isBerryEatingPrevented）があれば食べない
 * 3. 持ち物を使い切る（consumeItem）
 * 4. きのみの onEat を呼ぶ
 * 5. 持ち主の特性の onEatItem を呼ぶ（ほおぶくろ・はんすう）
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
  if (await isBerryEatingPrevented(holder, battleContext)) {
    return undefined;
  }
  if ((await consumeItem(holder, battleContext)) === undefined) {
    return undefined;
  }
  const latest = async (): Promise<BattlePokemonStatus> =>
    (await battleContext.battleRepository?.findBattlePokemonStatusById(holder.id)) ?? holder;

  const messages: Array<string | null> = [];
  messages.push(await effect.onEat(await latest(), itemName, battleContext));
  const abilityEffect = await getAbilityEffect(await resolveAbilityName(holder, battleContext));
  if (abilityEffect?.onEatItem) {
    messages.push(await abilityEffect.onEatItem(await latest(), itemName, battleContext));
  }
  return messages.filter((message): message is string => Boolean(message));
};
