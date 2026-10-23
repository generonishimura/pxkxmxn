import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { consumeItem } from '../../battle-events/item-lookup';
import type { EffectSource } from '../../battle-events/effect-source';
import type { StatChange } from '../../battle-events/stat-change';

/**
 * 戻すランク
 */
const RANK_KEYS = [
  'attackRank',
  'defenseRank',
  'specialAttackRank',
  'specialDefenseRank',
  'speedRank',
  'accuracyRank',
  'evasionRank',
] as const satisfies ReadonlyArray<keyof BattlePokemonStatus>;

/**
 * しろいハーブ（White Herb）
 * 能力ランクが下がったら、使い切って、下がったランクをすべて 0 に戻す（上がったランクはそのまま）
 *
 * - onStatChanged: applyStatChanges でランクが変わったあと（いかく・ばかぢからの低下 など）
 * - onUpdate: すでに下がったランクがあるとき（本家の onUpdate）
 */
export class WhiteHerbEffect implements IItemEffect {
  async onStatChanged(
    holder: BattlePokemonStatus,
    _applied: readonly StatChange[],
    _source: EffectSource | undefined,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    return battleContext ? this.restore(holder, battleContext) : null;
  }

  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return this.restore(holder, battleContext);
  }

  /**
   * 下がったランクがあれば、使い切って 0 に戻す
   */
  private async restore(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    const loweredKeys = RANK_KEYS.filter(key => holder[key] < 0);
    if (!repository || holder.currentHp <= 0 || loweredKeys.length === 0) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    if (!itemName) {
      return null;
    }
    await repository.updateBattlePokemonStatus(
      holder.id,
      Object.fromEntries(loweredKeys.map(key => [key, 0])),
    );
    return `${itemName} returned its stats to normal!`;
  }
}
