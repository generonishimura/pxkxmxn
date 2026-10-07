import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import type { IAbilityEffect } from '../abilities/ability-effect.interface';
import { resolveBattleAbilityName } from './battle-traits';

/**
 * ポケモンの実効の特性名を求める（特性の上書き・いえき・かがくへんかガスを反映）
 * コンテキストの attacker / defender と同じポケモンなら attackerAbilityName / defenderAbilityName を使い
 * （エンジンが実効の特性名を入れている）、それ以外はリポジトリから引いて求める
 * 注: 技の処理の中で書き換えた特性（スキルスワップなど）は、同じ技のコンテキストの特性名には反映されない
 * @returns 特性名、特性が効いていない・わからない場合はundefined
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
  // コンテキストに場のポケモン（攻撃側・防御側）がいれば、その実効の特性でかがくへんかガスを判定する（リポジトリを引かない）
  const known = [
    { pokemon: battleContext.attacker, abilityName: battleContext.attackerAbilityName },
    { pokemon: battleContext.defender, abilityName: battleContext.defenderAbilityName },
  ].flatMap(({ pokemon: other, abilityName }) =>
    other && other.id !== pokemon.id
      ? [{ baseAbilityName: abilityName, volatileState: {}, fainted: other.currentHp <= 0 }]
      : [],
  );
  return resolveBattleAbilityName(
    pokemon,
    battleContext,
    known.length > 0 ? { others: known } : {},
  );
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
