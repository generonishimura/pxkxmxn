import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { IItemEffect } from '../items/item-effect.interface';
import { ItemRegistry } from '../items/item-registry';

/**
 * ポケモンが今持っている持ち物の名前
 * 注: 持ち物の効果を消す状態（マジックルーム・さしおさえ・ぶきよう）は、まだ見ていない
 * @returns 持ち物の名前、持っていなければ undefined
 */
export const resolveItemName = (pokemon: BattlePokemonStatus): string | undefined =>
  pokemon.persistentState.item;

/**
 * ポケモンが今持っている持ち物の効果
 * @returns 持ち物の効果、持っていない・登録していない持ち物なら undefined
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
