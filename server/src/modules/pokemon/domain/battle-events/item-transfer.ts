import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMegaEvolutionByStone } from '@/modules/battle/domain/logic/mega-evolutions';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect, isIgnoredByMoldBreaker, resolveAbilityName } from './ability-lookup';
import { getItemEffect, heldItemName } from './item-lookup';

/**
 * 持ち物を奪う・渡す・入れ替える補助関数（本家の takeItem / setItem と onTakeItem）
 *
 * - 持ち物を書き換えるのは persistentState.item だけ。使い切った持ち物（consumedItem）には残さない
 *   （本家の takeItem と同じ。リサイクルで戻せない）
 * - 持ち物の効果が消されていても（さしおさえ）、持っている持ち物を動かす（heldItemName を読む）
 * - 持ち物が変わったポケモンは、こだわりの固定（choiceLockedMoveId）を解く。特性（ごりむちゅう）で固定しているときは解かない
 *   （本家の choicelock は、こだわりの持ち物でなくなると消え、こだわりの持ち物を受け取ったときも onStart で消える）
 * - 受け取ったポケモンは、持ち物の onEntry を呼ぶ（本家の setItem が呼ぶ onStart。エレキシードなど）
 */

/**
 * 持ち物が、そのポケモンから外せない・そのポケモンに渡せないものか（本家の持ち物の onTakeItem）
 * その種族のメガストーンは、持ち主から外せず、その種族に渡すこともできない
 * 種族は、もとの全国図鑑の番号で見る（へんしんしても変わらない。本家の baseSpecies）
 * @param pokemon 持ち物を失う・受け取るポケモン
 * @param itemName 持ち物の名前
 */
export const isItemBoundTo = async (
  pokemon: BattlePokemonStatus,
  itemName: string,
  battleContext: BattleContext,
): Promise<boolean> => {
  const mega = findMegaEvolutionByStone(itemName);
  if (!mega) {
    return false;
  }
  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    pokemon.trainedPokemonId,
  );
  return trainedPokemon?.pokemon.nationalDex === mega.nationalDex;
};

/**
 * 持ち主の特性が、ほかのポケモンに持ち物を奪われないようにしているか（ねんちゃく。本家の onTakeItem）
 * - 自分で手放すとき（source が持ち主）は止めない
 * - ひんしの持ち主は止めない
 * - 奪う側のかたやぶり系の特性で無視される
 * @param holder 持ち主
 * @param source 持ち物を奪う・入れ替えるポケモン
 */
export const blocksItemRemoval = async (
  holder: BattlePokemonStatus,
  source: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (holder.id === source.id || holder.currentHp <= 0) {
    return false;
  }
  const holderAbilityName = await resolveAbilityName(holder, battleContext);
  if ((await getAbilityEffect(holderAbilityName))?.preventsItemRemoval !== true) {
    return false;
  }
  const sourceAbilityName = await resolveAbilityName(source, battleContext);
  return !(await isIgnoredByMoldBreaker(sourceAbilityName, holderAbilityName, battleContext));
};

/**
 * 持ち物を外せるか（書き込まない）
 * @returns 外せるなら持ち物の名前、外せない・持っていなければ undefined
 */
const findRemovableItem = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
  source: BattlePokemonStatus | undefined,
): Promise<string | undefined> => {
  const itemName = heldItemName(holder);
  if (itemName === undefined || (await isItemBoundTo(holder, itemName, battleContext))) {
    return undefined;
  }
  if (source && (await blocksItemRemoval(holder, source, battleContext))) {
    return undefined;
  }
  return itemName;
};

/**
 * 持ち物が変わったポケモンの、こだわりの固定を解く（特性の locksMoveChoice で固定しているときは解かない）
 */
const releaseChoiceLock = async (
  pokemonId: number,
  battleContext: BattleContext,
): Promise<void> => {
  const repository = battleContext.battleRepository;
  const latest = await repository?.findBattlePokemonStatusById(pokemonId);
  if (!repository || !latest || latest.volatileState.choiceLockedMoveId === undefined) {
    return;
  }
  const abilityName = await resolveAbilityName(latest, battleContext);
  if ((await getAbilityEffect(abilityName))?.locksMoveChoice === true) {
    return;
  }
  await repository.patchVolatileState(pokemonId, { choiceLockedMoveId: null });
};

/**
 * 持ち物を受け取ったポケモンの、持ち物の onEntry を呼ぶ（本家の setItem の onStart）
 */
const startReceivedItem = async (
  pokemonId: number,
  battleContext: BattleContext,
): Promise<void> => {
  const latest = await battleContext.battleRepository?.findBattlePokemonStatusById(pokemonId);
  if (!latest || latest.isFainted()) {
    return;
  }
  await getItemEffect(latest)?.onEntry?.(latest, battleContext);
};

/**
 * 持ち物を外す（本家の takeItem）
 * - 持っていない・その種族のメガストーン（isItemBoundTo）なら外さない
 * - source に持ち主以外を渡すと、持ち主のねんちゃく（blocksItemRemoval）で外せない
 * @param holder 持ち主（最新の状態）
 * @param options.source 持ち物を奪うポケモン。省略すると持ち主が自分で手放す
 * @returns 外した持ち物の名前、外せなければ undefined（何も書かない）
 */
export const takeItem = async (
  holder: BattlePokemonStatus,
  battleContext: BattleContext,
  options: { readonly source?: BattlePokemonStatus } = {},
): Promise<string | undefined> => {
  const repository = battleContext.battleRepository;
  const itemName = await findRemovableItem(holder, battleContext, options.source);
  if (itemName === undefined || !repository) {
    return undefined;
  }
  await repository.patchPersistentState(holder.id, { item: null });
  await releaseChoiceLock(holder.id, battleContext);
  return itemName;
};

/**
 * 持ち物のないポケモンに持ち物を持たせられるか（書き込まない）
 * ひんし・すでに持ち物がある・その種族のメガストーン（isItemBoundTo）なら持たせられない
 */
export const canGiveItem = async (
  receiver: BattlePokemonStatus,
  itemName: string,
  battleContext: BattleContext,
): Promise<boolean> =>
  receiver.currentHp > 0 &&
  heldItemName(receiver) === undefined &&
  !(await isItemBoundTo(receiver, itemName, battleContext));

/**
 * 持ち物のないポケモンに持ち物を持たせる（本家の setItem）
 * 持たせたら、こだわりの固定を解き、持ち物の onEntry を呼ぶ
 * @param receiver 受け取るポケモン（最新の状態）
 * @returns 持たせたら true（canGiveItem が false なら何も書かない）
 */
export const giveItem = async (
  receiver: BattlePokemonStatus,
  itemName: string,
  battleContext: BattleContext,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (!repository || !(await canGiveItem(receiver, itemName, battleContext))) {
    return false;
  }
  await repository.patchPersistentState(receiver.id, { item: itemName });
  await releaseChoiceLock(receiver.id, battleContext);
  await startReceivedItem(receiver.id, battleContext);
  return true;
};

/**
 * 入れ替えた持ち物（入れ替える前に、それぞれが持っていたもの）
 */
export interface SwappedItems {
  /** source が持っていた持ち物（target が受け取った） */
  readonly sourceItem: string | undefined;
  /** target が持っていた持ち物（source が受け取った） */
  readonly targetItem: string | undefined;
}

/**
 * 2 体の持ち物を入れ替える（トリック・すりかえ。本家の trick の onHit）
 *
 * 次のどれかなら、何も書かずに undefined を返す
 * - どちらかがひんし
 * - どちらも持ち物を持っていない
 * - source の持ち物が source から外せない・target に渡せない（その種族のメガストーン）
 * - target の持ち物が target から外せない・source に渡せない、または target のねんちゃく（blocksItemRemoval）
 *
 * 入れ替えたら、両方のこだわりの固定を解き、target → source の順に受け取った持ち物の onEntry を呼ぶ
 * @param source 技を使ったポケモン（最新の状態）
 * @param target 相手（最新の状態）
 */
export const swapItems = async (
  source: BattlePokemonStatus,
  target: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<SwappedItems | undefined> => {
  const repository = battleContext.battleRepository;
  if (!repository || source.currentHp <= 0 || target.currentHp <= 0) {
    return undefined;
  }
  const sourceItem = heldItemName(source);
  const targetItem = heldItemName(target);
  if (sourceItem === undefined && targetItem === undefined) {
    return undefined;
  }
  const canMove = async (
    from: BattlePokemonStatus,
    to: BattlePokemonStatus,
    itemName: string | undefined,
  ): Promise<boolean> =>
    itemName === undefined ||
    ((await findRemovableItem(from, battleContext, source)) === itemName &&
      !(await isItemBoundTo(to, itemName, battleContext)));
  if (
    !(await canMove(source, target, sourceItem)) ||
    !(await canMove(target, source, targetItem))
  ) {
    return undefined;
  }

  await repository.patchPersistentState(target.id, { item: sourceItem ?? null });
  await repository.patchPersistentState(source.id, { item: targetItem ?? null });
  await releaseChoiceLock(target.id, battleContext);
  await releaseChoiceLock(source.id, battleContext);
  await startReceivedItem(target.id, battleContext);
  await startReceivedItem(source.id, battleContext);
  return { sourceItem, targetItem };
};
