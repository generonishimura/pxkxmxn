import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  abilityHolderOf,
  battleStatsOf,
  battleTypeNamesOf,
} from '@/modules/battle/domain/logic/battle-pokemon-traits';
import {
  AbilityHolder,
  EffectiveTypeParams,
  NEUTRALIZING_GAS_ABILITY_NAME,
  resolveEffectiveAbilityName,
} from '@/modules/battle/domain/logic/effective-traits';
import { hasAbilityFlag } from '@/modules/battle/domain/logic/ability-flags';
import type { BattleStatValues } from '../abilities/battle-context.interface';

/**
 * 実効のタイプ・特性・実数値を引くのに使うリポジトリ（BattleContext もそのまま渡せる）
 */
export interface BattleTraitsDeps {
  readonly battleRepository?: IBattleRepository;
  readonly trainedPokemonRepository?: ITrainedPokemonRepository;
}

/**
 * バトル中のポケモンの実効のタイプ・特性・実数値
 */
export interface BattlePokemonTraits {
  readonly trainedPokemon: TrainedPokemon;
  /** 実効の特性名（いえき・かがくへんかガスで消えていれば undefined） */
  readonly abilityName: string | undefined;
  /** 実効のタイプ名（resolveEffectiveTypeNames） */
  readonly typeNames: readonly string[];
  /** ランク補正の前の実数値（フォルム・statOverrides を反映） */
  readonly stats: BattleStatValues;
}

/**
 * 場にいるほかのポケモン（かがくへんかガスの判定に使う）をリポジトリから引く
 */
const loadOthers = async (
  pokemon: BattlePokemonStatus,
  deps: BattleTraitsDeps,
): Promise<AbilityHolder[]> => {
  const statuses =
    (await deps.battleRepository?.findBattlePokemonStatusByBattleId(pokemon.battleId)) ?? [];
  const holders: AbilityHolder[] = [];
  for (const status of statuses) {
    if (!status.isActive || status.id === pokemon.id) {
      continue;
    }
    const trainedPokemon = await deps.trainedPokemonRepository?.findById(status.trainedPokemonId);
    if (trainedPokemon) {
      holders.push(abilityHolderOf({ trainedPokemon, status }));
    }
  }
  return holders;
};

/**
 * ほかのポケモンのかがくへんかガスで消えうる特性か（効いていて、消せない特性・かがくへんかガスでない）
 */
const canBeNeutralized = (abilityName: string | undefined): boolean =>
  abilityName !== undefined &&
  abilityName !== NEUTRALIZING_GAS_ABILITY_NAME &&
  !hasAbilityFlag(abilityName, 'cantSuppress');

/**
 * 実効の特性名を求める（場にいるほかのポケモンのかがくへんかガスも見る）
 * かがくへんかガスで消えうる特性のときだけ、others がなければ場のほかのポケモンをリポジトリから引く
 */
const effectiveAbilityNameOf = async (
  holder: AbilityHolder,
  pokemon: BattlePokemonStatus,
  deps: BattleTraitsDeps,
  others: readonly AbilityHolder[] | undefined,
): Promise<string | undefined> => {
  const alone = resolveEffectiveAbilityName(holder);
  if (!canBeNeutralized(alone)) {
    return alone;
  }
  return resolveEffectiveAbilityName(holder, others ?? (await loadOthers(pokemon, deps)));
};

/**
 * 引く育成ポケモンと、場のほかのポケモンの特性
 * - trainedPokemon: すでに引いた育成ポケモン（引き直さない）
 * - others: 場にいるほかのポケモンの特性（すでに分かっていれば渡す。渡さなければリポジトリから引く）
 */
export interface BattleTraitsOptions {
  readonly trainedPokemon?: TrainedPokemon | null;
  readonly others?: readonly AbilityHolder[];
}

/**
 * バトル中のポケモンの実効のタイプ・特性・実数値を引く（育成ポケモンが見つからなければ undefined）
 * 特性は、場にいるほかのポケモンのかがくへんかガスも見る
 */
export const resolveBattlePokemonTraits = async (
  pokemon: BattlePokemonStatus,
  deps: BattleTraitsDeps,
  options: BattleTraitsOptions = {},
): Promise<BattlePokemonTraits | undefined> => {
  const trainedPokemon =
    options.trainedPokemon ??
    (await deps.trainedPokemonRepository?.findById(pokemon.trainedPokemonId));
  if (!trainedPokemon) {
    return undefined;
  }
  const holder = abilityHolderOf({ trainedPokemon, status: pokemon });
  return {
    trainedPokemon,
    abilityName: await effectiveAbilityNameOf(holder, pokemon, deps, options.others),
    typeNames: battleTypeNamesOf(trainedPokemon, pokemon),
    stats: battleStatsOf(trainedPokemon, pokemon),
  };
};

/**
 * バトル中のポケモンの実効の特性名だけを引く（タイプ・実数値は求めない）
 * @returns 特性が効いていない・育成ポケモンが見つからなければ undefined
 */
export const resolveBattleAbilityName = async (
  pokemon: BattlePokemonStatus,
  deps: BattleTraitsDeps,
  options: BattleTraitsOptions = {},
): Promise<string | undefined> => {
  const trainedPokemon =
    options.trainedPokemon ??
    (await deps.trainedPokemonRepository?.findById(pokemon.trainedPokemonId));
  if (!trainedPokemon) {
    return undefined;
  }
  return effectiveAbilityNameOf(
    abilityHolderOf({ trainedPokemon, status: pokemon }),
    pokemon,
    deps,
    options.others,
  );
};

/**
 * 実効のタイプを求めるときのオプション
 * - excludeAddedType: 3 つめのタイプ（addedType。ハロウィン・もりののろい）を除く（本家の getTypes(true)。
 *   ミラータイプ・もえつきる・でんこうそうげきで写すタイプ）
 * - ignoreRoost: はねやすめで失ったひこうタイプも含める（本家の roost の typeWas）
 */
export type TypeNamesOptions = Pick<EffectiveTypeParams, 'excludeAddedType' | 'ignoreRoost'>;

/**
 * 実効のタイプ名を引く（みずびたし・はねやすめ・ハロウィン・フォルムなどを反映）
 * 技・特性の実装でタイプを判定するときは、TrainedPokemon のタイプではなく必ずこれを使う
 * @param options 3 つめのタイプを除く・はねやすめを見ない（TypeNamesOptions）
 * @returns 育成ポケモンが見つからなければ空の配列
 */
export const resolveTypeNames = async (
  pokemon: BattlePokemonStatus,
  deps: BattleTraitsDeps,
  options: TypeNamesOptions = {},
): Promise<string[]> => {
  const trainedPokemon = await deps.trainedPokemonRepository?.findById(pokemon.trainedPokemonId);
  return trainedPokemon ? battleTypeNamesOf(trainedPokemon, pokemon, options) : [];
};

/**
 * 実効のタイプにそのタイプがあるか（本家の hasType）
 * @param options 3 つめのタイプを除く・はねやすめを見ない（TypeNamesOptions）
 */
export const hasType = async (
  pokemon: BattlePokemonStatus,
  typeName: string,
  deps: BattleTraitsDeps,
  options: TypeNamesOptions = {},
): Promise<boolean> => (await resolveTypeNames(pokemon, deps, options)).includes(typeName);
