import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { FieldTurnsTarget, IItemEffect } from '../items/item-effect.interface';
import { ItemRegistry } from '../items/item-registry';

/**
 * ポケモンが持っている持ち物の名前（効果を消されていても返す。本家の pokemon.item）
 * 持ち物を奪う・入れ替える技（トリック・ギフトパスなど）とメガシンカが読む。効果を見るときは resolveItemName を使う
 * @returns 持ち物の名前、持っていなければ undefined（状態を持たないテスト用のポケモンも undefined）
 */
export const heldItemName = (pokemon: BattlePokemonStatus): string | undefined =>
  pokemon.persistentState?.item;

/**
 * 持ち物の効果が消されているか（本家の ignoringItem）
 *
 * 今見ている理由: さしおさえ（volatileState.embargoTurns）
 * 注: マジックルーム（GlobalFieldState.magicRoomTurns）・ぶきよう（特性）はまだ見ていない。
 *     足すときはここに理由を足す（マジックルームは場の状態なので、バトルを受け取る形にする）
 */
export const isItemSuppressed = (pokemon: BattlePokemonStatus): boolean =>
  pokemon.volatileState?.embargoTurns !== undefined;

/**
 * ポケモンの持ち物のうち、今効果のある持ち物の名前
 * 持ち物の効果が消されている（isItemSuppressed）ときは、持っていても undefined を返す
 * @returns 持ち物の名前、持っていない・効果が消されていれば undefined
 */
export const resolveItemName = (pokemon: BattlePokemonStatus): string | undefined =>
  isItemSuppressed(pokemon) ? undefined : heldItemName(pokemon);

/**
 * ポケモンが今持っている持ち物の効果
 * @returns 持ち物の効果、持っていない・登録していない持ち物・効果が消されていれば undefined
 */
export const getItemEffect = (pokemon: BattlePokemonStatus): IItemEffect | undefined => {
  const itemName = resolveItemName(pokemon);
  return itemName === undefined ? undefined : ItemRegistry.get(itemName);
};

/**
 * 持ち物を使い切る（きのみを食べた・ふうせんが割れた など）
 * 持ち物を消して、使った持ち物として残す（リサイクル・しゅうかくが読む）
 * @returns 使い切った持ち物の名前、持っていなければ undefined（何も書かない）
 */
export const consumeItem = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string | undefined> => {
  const itemName = resolveItemName(pokemon);
  if (itemName === undefined || !battleContext.battleRepository) {
    return undefined;
  }
  await battleContext.battleRepository.patchPersistentState(pokemon.id, {
    item: null,
    consumedItem: itemName,
  });
  return itemName;
};

/**
 * 場の状態の残りターン数（出したポケモンの持ち物の modifyFieldTurns を反映する）
 * ひかりのねんど・あついいわ・グランドコートなどで 5 → 8 にする
 * @param source 場の状態を出したポケモン。わからなければ undefined（持ち物を見ない）
 * @param target 出した場の状態
 * @param turns 既定の残りターン数
 */
export const resolveFieldTurns = (
  source: BattlePokemonStatus | undefined,
  target: FieldTurnsTarget,
  turns: number,
): number => (source && getItemEffect(source)?.modifyFieldTurns?.(source, target, turns)) ?? turns;

/**
 * HP を吸い取って回復する量（回復するポケモンの持ち物の modifyDrainHeal を反映する。おおきなねっこ）
 * @param healer 回復するポケモン
 * @param amount 持ち物の補正の前の量
 */
export const resolveDrainHealAmount = (healer: BattlePokemonStatus, amount: number): number =>
  getItemEffect(healer)?.modifyDrainHeal?.(healer, amount) ?? amount;

/**
 * 持ち主の状態が変わったあとに、持ち物の onUpdate を呼ぶ（本家の onUpdate）
 *
 * - 持ち物に onUpdate がなければ、リポジトリを読まずに何もしない
 * - 持ち主を読み直し、場にいて、ひんしでないときだけ、読み直した持ち物の onUpdate を呼ぶ
 *
 * @param pokemon 持ち主（古い状態でもよい。ID と持ち物を見て、読み直す）
 * @returns 持ち物のメッセージ（何もしなければ null）
 */
export const runItemUpdate = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string | null> => {
  const repository = battleContext.battleRepository;
  if (!getItemEffect(pokemon)?.onUpdate || !repository) {
    return null;
  }
  const latest = (await repository.findBattlePokemonStatusById(pokemon.id)) ?? pokemon;
  if (!latest.isActive || latest.isFainted()) {
    return null;
  }
  return (await getItemEffect(latest)?.onUpdate?.(latest, battleContext)) ?? null;
};
