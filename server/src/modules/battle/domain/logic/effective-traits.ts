import { VolatileState } from '../state/volatile-state';
import { hasAbilityFlag } from './ability-flags';

/**
 * タイプなし（本家の '???'）。もえつきる・でんこうそうげきで、ほのお・でんきタイプの代わりに入る
 * どのタイプ相性表にもないので、相性は等倍、タイプ一致にもならない
 */
export const TYPELESS_TYPE_NAME = '???';

/** かがくへんかガス（場にいる間、ほかのポケモンの特性を消す） */
export const NEUTRALIZING_GAS_ABILITY_NAME = 'かがくへんかガス';

/** はねやすめで失うタイプ */
const FLYING_TYPE_NAME = 'ひこう';
/** タイプがなくなったとき（ひこうタイプだけのポケモンのはねやすめ）のタイプ（第 5 世代から） */
const FALLBACK_TYPE_NAME = 'ノーマル';

/**
 * 特性を持つポケモン 1 匹分の情報（実効の特性を求めるのに使う）
 */
export interface AbilityHolder {
  /** 育成ポケモンの特性名（TrainedPokemon.ability.name） */
  readonly baseAbilityName?: string;
  readonly volatileState: VolatileState;
  /** ひんしか（ひんしのかがくへんかガスは、ほかの特性を消さない） */
  readonly fainted?: boolean;
}

/**
 * 今の特性名（消されているかは見ない）。volatileState.abilityOverride があればそれ、なければもとの特性
 * スキルスワップ・なりきりで写す特性や、ミイラで上書きできるかの判定に使う（本家の pokemon.ability）
 */
export const currentAbilityName = (holder: AbilityHolder): string | undefined =>
  holder.volatileState.abilityOverride ?? holder.baseAbilityName;

/**
 * かがくへんかガスでほかの特性を消しているか
 * ひんし・いえき・へんしん中のかがくへんかガスは消さない（本家の ignoringAbility）
 */
export const emitsNeutralizingGas = (holder: AbilityHolder): boolean =>
  holder.fainted !== true &&
  currentAbilityName(holder) === NEUTRALIZING_GAS_ABILITY_NAME &&
  holder.volatileState.abilitySuppressed !== true &&
  holder.volatileState.transformedIntoStatusId === undefined;

/**
 * 実効の特性名（効いていなければ undefined）。AbilityRegistry を引く前に、必ずこれを通す
 *
 * 1. 今の特性（abilityOverride → もとの特性）
 * 2. へんしん中は、noTransform の特性（ばけのかわ・アイスフェイスなど）が効かない
 * 3. 消せない特性（cantSuppress）は、いえき・かがくへんかガスでも効く
 * 4. いえき・コアパニッシャー（abilitySuppressed）なら効かない
 * 5. ほかの場のポケモンのかがくへんかガスで効かない（かがくへんかガス自身は消えない）
 *
 * @param others 場にいるほかのポケモン（シングルバトルでは相手）。かがくへんかガスの判定に使う
 */
export const resolveEffectiveAbilityName = (
  holder: AbilityHolder,
  others: readonly AbilityHolder[] = [],
): string | undefined => {
  const name = currentAbilityName(holder);
  if (name === undefined) {
    return undefined;
  }
  const state = holder.volatileState;
  if (state.transformedIntoStatusId !== undefined && hasAbilityFlag(name, 'noTransform')) {
    return undefined;
  }
  if (hasAbilityFlag(name, 'cantSuppress')) {
    return name;
  }
  if (state.abilitySuppressed === true) {
    return undefined;
  }
  if (name !== NEUTRALIZING_GAS_ABILITY_NAME && others.some(emitsNeutralizingGas)) {
    return undefined;
  }
  return name;
};

/**
 * 実効のタイプを求める入力
 */
export interface EffectiveTypeParams {
  /** 育成ポケモンのタイプ名（DB の Pokemon のタイプ） */
  readonly baseTypeNames: readonly string[];
  readonly volatileState: VolatileState;
  /** 今のフォルムのタイプ（pokemon-forms の表。フォルムがなければ undefined） */
  readonly formTypeNames?: readonly string[];
  /** addedType（ハロウィン・もりののろい）を足さない（へんしんで写すタイプ。本家の getTypes(true)） */
  readonly excludeAddedType?: boolean;
  /** はねやすめのひこうタイプの消去をしない（へんしんで写すタイプ。本家の roost の typeWas） */
  readonly ignoreRoost?: boolean;
}

/**
 * 実効のタイプ名（本家の getTypes）。タイプ一致・相性・タイプの免疫・設置技・天候のダメージは、必ずこれを通す
 *
 * 1. volatileState.typeOverride（みずびたし・テクスチャーなど）→ フォルムのタイプ → もとのタイプ
 * 2. はねやすめのターン（roosting）は、ひこうタイプを除く。なくなったらノーマルタイプ
 * 3. volatileState.addedType（ハロウィン・もりののろい）を 3 つめに足す（すでに持っていれば足さない）
 *
 * タイプなし（TYPELESS_TYPE_NAME）を含むことがある。タイプ名の判定（includes）では、どのタイプとも一致しない
 */
export const resolveEffectiveTypeNames = (params: EffectiveTypeParams): string[] => {
  const state = params.volatileState;
  let types: readonly string[] = state.typeOverride ?? params.formTypeNames ?? params.baseTypeNames;
  if (state.roosting === true && params.ignoreRoost !== true) {
    types = types.filter(type => type !== FLYING_TYPE_NAME);
  }
  if (types.length === 0) {
    types = [FALLBACK_TYPE_NAME];
  }
  const added = state.addedType;
  if (params.excludeAddedType !== true && added !== undefined && !types.includes(added)) {
    types = [...types, added];
  }
  return [...types];
};
