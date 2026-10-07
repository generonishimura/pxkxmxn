import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';
import { BattleContext } from '../abilities/battle-context.interface';
import { getAbilityEffect, resolveAbilityName } from './ability-lookup';

/**
 * 状態異常として扱う状態を返す（同期。技の modifyMovePower・shouldFail などから使う）
 *
 * 1. 状態異常（やけど・ねむりなど）があれば、その状態異常
 * 2. なければ、コンテキストの attackerEffectiveStatus / defenderEffectiveStatus
 *    （エンジンが、特性の treatedAsStatusCondition から入れる。ぜったいねむりならねむり）
 * 3. どちらでもなければ null
 *
 * たたりめ・ゆめくい・ねごと・いびき・めざましビンタ・あくむは、statusCondition ではなくこれで判定する
 */
export const getEffectiveStatusCondition = (
  pokemon: BattlePokemonStatus,
  battleContext?: BattleContext,
): StatusCondition | null => {
  if (isMajorStatus(pokemon.statusCondition)) {
    return pokemon.statusCondition;
  }
  if (battleContext?.attacker?.id === pokemon.id) {
    return battleContext.attackerEffectiveStatus ?? null;
  }
  if (battleContext?.defender?.id === pokemon.id) {
    return battleContext.defenderEffectiveStatus ?? null;
  }
  return null;
};

/**
 * 状態異常として扱う状態を、特性を引いて求める（非同期。ターン終了時など、コンテキストに入っていないとき）
 */
export const resolveEffectiveStatusCondition = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<StatusCondition | null> => {
  if (isMajorStatus(pokemon.statusCondition)) {
    return pokemon.statusCondition;
  }
  const ability = await getAbilityEffect(await resolveAbilityName(pokemon, battleContext));
  return ability?.treatedAsStatusCondition ?? null;
};

/**
 * ねむりとして扱うか（ねむり、またはぜったいねむり）
 */
export const isEffectivelyAsleep = (
  pokemon: BattlePokemonStatus,
  battleContext?: BattleContext,
): boolean => getEffectiveStatusCondition(pokemon, battleContext) === StatusCondition.Sleep;
