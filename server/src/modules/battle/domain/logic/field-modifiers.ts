import { Field } from '../entities/battle.entity';
import { PrimalWeather, SideConditions, SideState, getGlobalFieldState } from '../state/side-state';
import { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

/**
 * 場の状態（壁・おいかぜ・ルーム・フィールド・どろあそび・みずあそび・ゲンシ天候）による補正
 * エンジン（DamageCalculator・AccuracyCalculator・行動順・技の実行）が読む。技・特性からは呼ばない
 */

/**
 * 壁（リフレクター・ひかりのかべ・オーロラベール）のダメージ補正（4096 分率。シングルバトルは 0.5 倍）
 */
export const SCREEN_DAMAGE_MODIFIER = 2048;

/**
 * おいかぜの素早さの倍率
 */
export const TAILWIND_SPEED_MULTIPLIER = 2;

/**
 * じゅうりょくの命中率の補正（本家の chainModify([6840, 4096])）
 */
export const GRAVITY_ACCURACY_MODIFIER = 6840;

/**
 * フィールドで強くなる技の補正（第 8 世代から 1.3 倍）
 */
const TERRAIN_BOOST_MODIFIER = 5325;

/**
 * グラスフィールドのじしんなど・ミストフィールドのドラゴン技の補正（0.5 倍）
 */
const TERRAIN_WEAKEN_MODIFIER = 2048;

/**
 * どろあそび・みずあそびの補正（本家の chainModify([1352, 4096])）
 */
const SPORT_MODIFIER = 1352;

/**
 * フィールドごとの、地面にいるポケモンが使うと強くなる技のタイプ
 */
const TERRAIN_BOOSTED_TYPES: Readonly<Partial<Record<Field, string>>> = {
  [Field.ElectricTerrain]: 'でんき',
  [Field.GrassyTerrain]: 'くさ',
  [Field.PsychicTerrain]: 'エスパー',
};

/**
 * グラスフィールドで、地面にいる相手への威力が半分になる技
 */
export const GRASSY_TERRAIN_WEAKENED_MOVES: readonly string[] = [
  'じしん',
  'じならし',
  'マグニチュード',
];

/**
 * 壁のダメージ補正を返す（効かないときは undefined）
 * - リフレクター: 物理技、ひかりのかべ: 特殊技、オーロラベール: 両方（重ねても 1 回だけ）
 * - 急所に当たったとき・すりぬけの攻撃は効かない
 * 注: シングルバトルの 0.5 倍だけを扱う（ダブルバトルの 2732/4096 は扱わない）
 * @param defenderSide 技を受けるポケモンの陣営
 */
export const screenDamageModifier = (
  defenderSide: SideConditions,
  category: 'Physical' | 'Special' | 'Status',
  options: { readonly isCriticalHit?: boolean; readonly infiltrates?: boolean } = {},
): number | undefined => {
  if (options.isCriticalHit === true || options.infiltrates === true || category === 'Status') {
    return undefined;
  }
  const screened =
    defenderSide.auroraVeilTurns !== undefined ||
    (category === 'Physical' && defenderSide.reflectTurns !== undefined) ||
    (category === 'Special' && defenderSide.lightScreenTurns !== undefined);
  return screened ? SCREEN_DAMAGE_MODIFIER : undefined;
};

/**
 * 技を受けるポケモンの陣営の状態で、急所に当たらないか（おまじない）
 * 注: 急所の仕組み（急所ランク・確率）はまだないので、エンジンはまだ呼ばない。急所を決める処理を作るときに、
 *     防御側の陣営で true なら急所にしない
 * @param defenderSide 技を受けるポケモンの陣営
 */
export const preventsCriticalHit = (defenderSide: SideConditions): boolean =>
  defenderSide.luckyChantTurns !== undefined;

/**
 * 陣営の状態による素早さの倍率（おいかぜなら 2 倍）
 */
export const sideSpeedMultiplier = (side: SideConditions): number =>
  side.tailwindTurns !== undefined ? TAILWIND_SPEED_MULTIPLIER : 1;

/**
 * トリックルームの間か
 */
export const isTrickRoomActive = (sideState: SideState): boolean =>
  getGlobalFieldState(sideState).trickRoomTurns !== undefined;

/**
 * 同じ優先度で、素早さ speed のポケモンが otherSpeed のポケモンより先に動くか
 * トリックルームの間は遅い方が先。同じ速さなら speed の側（先に渡した方）を先にする
 * 注: 本家は同じ速さならランダムで、トリックルームは 10000 - 素早さ で比べる（素早さ 10000 以上は扱わない）
 */
export const movesBefore = (speed: number, otherSpeed: number, trickRoom: boolean): boolean =>
  trickRoom ? speed <= otherSpeed : speed >= otherSpeed;

/**
 * ワンダールームの間は、防御と特防の実数値（ランク補正の前）を入れ替える
 * ランクは入れ替えない（本家の calculateStat と同じ）
 */
export const swapDefensesInWonderRoom = (
  stats: BattleStatValues,
  sideState: SideState | undefined,
): BattleStatValues =>
  sideState && getGlobalFieldState(sideState).wonderRoomTurns !== undefined
    ? { ...stats, defense: stats.specialDefense, specialDefense: stats.defense }
    : stats;

/**
 * 場の状態による威力の補正の入力
 */
export interface FieldBasePowerParams {
  readonly field: Field | null | undefined;
  readonly sideState: SideState;
  /** 技のタイプ名（タイプ変更の反映後） */
  readonly moveTypeName: string;
  readonly moveName: string | undefined;
  /** 攻撃側が地面にいるか（isGrounded） */
  readonly attackerGrounded: boolean;
  /** 防御側が地面にいるか（isGrounded） */
  readonly defenderGrounded: boolean;
  /** 攻撃側が隠れているか（そらをとぶなど。フィールドで強くならない） */
  readonly attackerSemiInvulnerable?: boolean;
  /** 防御側が隠れているか（グラスフィールド・ミストフィールドの半減が効かない） */
  readonly defenderSemiInvulnerable?: boolean;
}

/**
 * 場の状態による威力の補正（4096 分率）の一覧。掛ける順に並べる
 * 1. フィールド: 地面にいるポケモンのでんき・くさ・エスパー技 1.3 倍。地面にいる相手への
 *    グラスフィールドのじしん・じならし・マグニチュード、ミストフィールドのドラゴン技 0.5 倍
 * 2. どろあそび（でんき技）・みずあそび（ほのお技）: 1352/4096
 */
export const fieldBasePowerModifiers = (params: FieldBasePowerParams): number[] => {
  const modifiers: number[] = [];
  const field = params.field ?? Field.None;
  const boostedType = TERRAIN_BOOSTED_TYPES[field];
  if (
    boostedType === params.moveTypeName &&
    params.attackerGrounded &&
    params.attackerSemiInvulnerable !== true
  ) {
    modifiers.push(TERRAIN_BOOST_MODIFIER);
  }
  const defenderAffected = params.defenderGrounded && params.defenderSemiInvulnerable !== true;
  if (
    defenderAffected &&
    ((field === Field.GrassyTerrain &&
      GRASSY_TERRAIN_WEAKENED_MOVES.includes(params.moveName ?? '')) ||
      (field === Field.MistyTerrain && params.moveTypeName === 'ドラゴン'))
  ) {
    modifiers.push(TERRAIN_WEAKEN_MODIFIER);
  }
  const global = getGlobalFieldState(params.sideState);
  if (
    (global.mudSportTurns !== undefined && params.moveTypeName === 'でんき') ||
    (global.waterSportTurns !== undefined && params.moveTypeName === 'ほのお')
  ) {
    modifiers.push(SPORT_MODIFIER);
  }
  return modifiers;
};

/**
 * 効果のあるゲンシ天候（ノーてんき・エアロックが場にいれば undefined）
 * @param abilityNames 場にいるポケモンの特性名
 */
export const effectivePrimalWeather = (
  sideState: SideState | undefined,
  abilityNames: ReadonlyArray<string | undefined>,
): PrimalWeather | undefined => {
  const primal = sideState ? getGlobalFieldState(sideState).primalWeather : undefined;
  if (primal === undefined) {
    return undefined;
  }
  const suppressed = abilityNames.some(
    name => name !== undefined && AbilityRegistry.get(name)?.suppressesWeather === true,
  );
  return suppressed ? undefined : primal;
};

/**
 * ゲンシ天候で技が失敗するか（おおあめのほのおの攻撃技、おおひでりのみずの攻撃技）
 */
export const primalWeatherBlocksMove = (
  primal: PrimalWeather | undefined,
  moveTypeName: string,
  category: 'Physical' | 'Special' | 'Status',
): boolean =>
  category !== 'Status' &&
  ((primal === 'heavyRain' && moveTypeName === 'ほのお') ||
    (primal === 'harshSunlight' && moveTypeName === 'みず'));

/**
 * らんきりゅうで、ひこうタイプへの弱点を等倍にするか
 * 攻撃技で、相手のタイプがひこうで、そのタイプへの相性が 1 より大きいとき
 */
export const isNeutralizedByStrongWinds = (
  primal: PrimalWeather | undefined,
  defenderTypeName: string,
  typeMultiplier: number,
  category: 'Physical' | 'Special' | 'Status',
): boolean =>
  primal === 'strongWinds' &&
  category !== 'Status' &&
  defenderTypeName === 'ひこう' &&
  typeMultiplier > 1;
