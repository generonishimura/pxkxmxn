import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import type { IAbilityEffect } from '../abilities/ability-effect.interface';

/**
 * ポケモンの特性名を求める
 * コンテキストの attacker / defender と同じポケモンなら attackerAbilityName / defenderAbilityName を使い、
 * それ以外は育成ポケモンリポジトリから引く
 * @returns 特性名、わからない場合はundefined
 */
export const resolveAbilityName = async (
  pokemon: BattlePokemonStatus,
  battleContext: BattleContext,
): Promise<string | undefined> => {
  if (battleContext.attacker?.id === pokemon.id && battleContext.attackerAbilityName) {
    return battleContext.attackerAbilityName;
  }
  if (battleContext.defender?.id === pokemon.id && battleContext.defenderAbilityName) {
    return battleContext.defenderAbilityName;
  }
  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    pokemon.trainedPokemonId,
  );
  return trainedPokemon?.ability?.name;
};

/**
 * 特性名から特性の効果を引く
 * 特性の効果のファイルからも呼べるよう、AbilityRegistry は動的インポートで読む（循環参照を避ける）
 */
export const getAbilityEffect = async (
  abilityName: string | undefined,
): Promise<IAbilityEffect | undefined> => {
  if (!abilityName) {
    return undefined;
  }
  const { AbilityRegistry } = await import('../abilities/ability-registry');
  return AbilityRegistry.get(abilityName);
};

/**
 * 相手を対象にする効果で、対象の特性が使い手のかたやぶり系の特性に無視されるか
 * battleContext は技のコンテキスト（きんしのちからの breaksMoldFor が moveCategory を見る）
 */
export const isIgnoredByMoldBreaker = async (
  sourceAbilityName: string | undefined,
  targetAbilityName: string | undefined,
  battleContext?: BattleContext,
): Promise<boolean> => {
  const { AbilityRegistry } = await import('../abilities/ability-registry');
  return AbilityRegistry.isIgnoredByMoldBreaker(
    sourceAbilityName,
    targetAbilityName,
    battleContext,
  );
};
