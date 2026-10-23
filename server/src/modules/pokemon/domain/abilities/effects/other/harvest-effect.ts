import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { getContextWeather } from '../../context-weather';
import { isBerry } from '../../../battle-events/eat-item';
import { heldItemName } from '../../../battle-events/item-lookup';
import { giveItem } from '../../../battle-events/item-transfer';

/**
 * しゅうかく（Harvest）特性の効果
 * ターン終了時に 1/2 の確率（晴れなら必ず）で、使い切ったきのみを持ち直す（本家の harvest）
 *
 * - 持ち物を持っていない・使い切った持ち物（consumedItem）がきのみ（isBerry）のときだけ
 * - 持ち直したら、使い切った持ち物を消す（本家の lastItem = ''）
 * - 晴れは効果のある天候で見る（getContextWeather。ノーてんきがいれば晴れでない）
 * - 持ち直したきのみは、そのポケモンのターン終了時の最後の onUpdate で、条件を満たせばすぐに食べる
 * 注: 持ち直したときのメッセージは出さない（onTurnEnd はメッセージを返せない）
 */
export class HarvestEffect implements IAbilityEffect {
  private static readonly CHANCE = 0.5;

  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (!battleContext || !repository) {
      return;
    }
    const sunny = getContextWeather(battleContext) === Weather.Sun;
    if (!sunny && Math.random() >= HarvestEffect.CHANCE) {
      return;
    }
    const berry = holder.persistentState.consumedItem;
    if (
      holder.currentHp <= 0 ||
      heldItemName(holder) !== undefined ||
      berry === undefined ||
      !isBerry(berry)
    ) {
      return;
    }
    if (await giveItem(holder, berry, battleContext)) {
      await repository.patchPersistentState(holder.id, { consumedItem: null });
    }
  }
}
