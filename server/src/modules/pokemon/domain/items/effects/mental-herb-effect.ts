import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { consumeItem } from '../../battle-events/item-lookup';

/**
 * メンタルハーブで治す一時的な状態（メロメロ・ちょうはつ・アンコール・いちゃもん・かなしばり・かいふくふうじ）
 */
const CURED_KEYS = [
  'infatuatedWithStatusId',
  'tauntTurns',
  'encore',
  'torment',
  'disable',
  'healBlockTurns',
] as const satisfies ReadonlyArray<keyof VolatileState>;

/**
 * メンタルハーブ（Mental Herb）
 * メロメロ・ちょうはつ・アンコール・いちゃもん・かなしばり・かいふくふうじのどれかになったら、使い切って、
 * そのすべてを治す（本家の onUpdate と同じ。ちょうはつなどの技は出し終えたとき、
 * メロメロボディ・のろわれボディはそのヒットのあとに見る）
 */
export class MentalHerbEffect implements IItemEffect {
  async onUpdate(
    holder: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository || !CURED_KEYS.some(key => holder.volatileState[key] !== undefined)) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    if (!itemName) {
      return null;
    }
    await repository.patchVolatileState(
      holder.id,
      Object.fromEntries(CURED_KEYS.map(key => [key, null])),
    );
    return `${itemName} cured its mental status!`;
  }
}
