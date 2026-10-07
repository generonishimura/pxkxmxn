import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import type { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { StatCalculator } from './stat-calculator';
import { applyStatOverrides } from './volatile-modifiers';
import { BaseStatValues, PokemonForm, findPokemonForm } from './pokemon-forms';
import {
  AbilityHolder,
  EffectiveTypeParams,
  resolveEffectiveAbilityName,
  resolveEffectiveTypeNames,
} from './effective-traits';

/**
 * バトル中のポケモン 1 匹分（育成ポケモンと、バトル中の状態）
 */
export interface BattlePokemonRef {
  readonly trainedPokemon: TrainedPokemon;
  readonly status: BattlePokemonStatus;
}

/**
 * 育成ポケモンのタイプ名（DB の Pokemon のタイプ。上書きは反映しない）
 */
export const baseTypeNamesOf = (trainedPokemon: TrainedPokemon): string[] =>
  [trainedPokemon.pokemon.primaryType.name, trainedPokemon.pokemon.secondaryType?.name].filter(
    (name): name is string => name !== undefined,
  );

/**
 * 今のフォルム（交代で戻る volatileState.form → 交代しても残る persistentState.form）
 * へんしん中は、自分のフォルムを見ない（写した相手のタイプ・実数値を使う）
 */
export const activeFormOf = (
  trainedPokemon: TrainedPokemon,
  status: BattlePokemonStatus,
): PokemonForm | undefined => {
  if (status.volatileState.transformedIntoStatusId !== undefined) {
    return undefined;
  }
  const form = status.volatileState.form ?? status.persistentState.form;
  return findPokemonForm(trainedPokemon.pokemon.nationalDex, form);
};

/**
 * 実効のタイプ名（タイプの上書き・フォルム・はねやすめ・3 つめのタイプを反映）
 * options でへんしんに写すタイプ（addedType とはねやすめを除く）を求められる
 */
export const battleTypeNamesOf = (
  trainedPokemon: TrainedPokemon,
  status: BattlePokemonStatus,
  options: Pick<EffectiveTypeParams, 'excludeAddedType' | 'ignoreRoost'> = {},
): string[] =>
  resolveEffectiveTypeNames({
    baseTypeNames: baseTypeNamesOf(trainedPokemon),
    volatileState: status.volatileState,
    formTypeNames: activeFormOf(trainedPokemon, status)?.types,
    ...options,
  });

/**
 * 実効の特性を求めるための、特性を持つポケモンの情報
 */
export const abilityHolderOf = (ref: BattlePokemonRef): AbilityHolder => ({
  baseAbilityName: ref.trainedPokemon.ability?.name,
  volatileState: ref.status.volatileState,
  fainted: ref.status.isFainted(),
});

/**
 * 実効の特性名（効いていなければ undefined）。AbilityRegistry を引く前に、必ずこれを通す
 * @param others 場にいるほかのポケモン（シングルバトルでは相手）。かがくへんかガスの判定に使う
 */
export const battleAbilityNameOf = (
  trainedPokemon: TrainedPokemon,
  status: BattlePokemonStatus,
  others: readonly BattlePokemonRef[] = [],
): string | undefined =>
  resolveEffectiveAbilityName(
    abilityHolderOf({ trainedPokemon, status }),
    others.filter(other => other.status.id !== status.id).map(abilityHolderOf),
  );

/**
 * 種族値（フォルムがあれば表の値、なければ DB の値）
 */
const baseStatsOf = (trainedPokemon: TrainedPokemon, form: PokemonForm | undefined) =>
  form?.baseStats ?? {
    hp: trainedPokemon.pokemon.baseHp,
    attack: trainedPokemon.pokemon.baseAttack,
    defense: trainedPokemon.pokemon.baseDefense,
    specialAttack: trainedPokemon.pokemon.baseSpecialAttack,
    specialDefense: trainedPokemon.pokemon.baseSpecialDefense,
    speed: trainedPokemon.pokemon.baseSpeed,
  };

/**
 * 種族値と育成ポケモンの個体値・努力値・性格から、実数値（HP を含む）を計算する
 */
const calculateStatsWith = (trainedPokemon: TrainedPokemon, base: BaseStatValues) =>
  StatCalculator.calculate({
    baseHp: base.hp,
    baseAttack: base.attack,
    baseDefense: base.defense,
    baseSpecialAttack: base.specialAttack,
    baseSpecialDefense: base.specialDefense,
    baseSpeed: base.speed,
    level: trainedPokemon.level,
    ivHp: trainedPokemon.ivHp,
    ivAttack: trainedPokemon.ivAttack,
    ivDefense: trainedPokemon.ivDefense,
    ivSpecialAttack: trainedPokemon.ivSpecialAttack,
    ivSpecialDefense: trainedPokemon.ivSpecialDefense,
    ivSpeed: trainedPokemon.ivSpeed,
    evHp: trainedPokemon.evHp,
    evAttack: trainedPokemon.evAttack,
    evDefense: trainedPokemon.evDefense,
    evSpecialAttack: trainedPokemon.evSpecialAttack,
    evSpecialDefense: trainedPokemon.evSpecialDefense,
    evSpeed: trainedPokemon.evSpeed,
    nature: trainedPokemon.nature,
  });

/**
 * ランク補正の前の実数値（フォルムの種族値で計算し、volatileState.statOverrides で上書きする）
 * へんしん中は statOverrides に写した相手の実数値が入っている
 */
export const battleStatsOf = (
  trainedPokemon: TrainedPokemon,
  status: BattlePokemonStatus,
): BattleStatValues => {
  const stats = calculateStatsWith(
    trainedPokemon,
    baseStatsOf(trainedPokemon, activeFormOf(trainedPokemon, status)),
  );
  return applyStatOverrides(
    {
      attack: stats.attack,
      defense: stats.defense,
      specialAttack: stats.specialAttack,
      specialDefense: stats.specialDefense,
      speed: stats.speed,
    },
    status.volatileState,
  );
};

/**
 * フォルムを変えたあとの最大 HP（スワームチェンジのパーフェクトフォルムなど）
 * @param form フォルム名。表にないフォルム・undefined なら DB の種族値で計算する
 */
export const battleMaxHpOf = (trainedPokemon: TrainedPokemon, form: string | undefined): number =>
  calculateStatsWith(
    trainedPokemon,
    baseStatsOf(trainedPokemon, findPokemonForm(trainedPokemon.pokemon.nationalDex, form)),
  ).hp;
