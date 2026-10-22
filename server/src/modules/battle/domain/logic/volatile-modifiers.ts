import { VolatileState } from '../state/volatile-state';
import type { BattleStatValues } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { MoveBehaviors } from '@/modules/pokemon/domain/moves/move-behaviors';

/**
 * 一時的な状態（volatileState）が、ダメージ計算・命中判定・行動順に与える補正
 * DamageCalculator / AccuracyCalculator / ActionOrderDeterminerService が読む
 */

/**
 * 実数値の上書き（パワートリック・パワーシフト・ガードシェア・パワーシェア・スピードスワップ）を反映する
 * ランク補正の前の実数値を、volatileState.statOverrides の値で置き換える
 */
export const applyStatOverrides = (
  stats: BattleStatValues,
  state: VolatileState,
): BattleStatValues => {
  const overrides = state.statOverrides;
  if (!overrides) {
    return stats;
  }
  return {
    attack: overrides.attack ?? stats.attack,
    defense: overrides.defense ?? stats.defense,
    specialAttack: overrides.specialAttack ?? stats.specialAttack,
    specialDefense: overrides.specialDefense ?? stats.specialDefense,
    speed: overrides.speed ?? stats.speed,
  };
};

/**
 * 地面にいない状態か（でんじふゆう・テレキネシス）。ねをはるで根を張っていれば地面にいる
 * じめん技が当たらない
 */
export const isLevitatingByVolatile = (state: VolatileState): boolean =>
  state.ingrain !== true &&
  (state.magnetRiseTurns !== undefined || state.telekinesisTurns !== undefined);

/**
 * 地面に縛られている状態か（ねをはる）。ひこうタイプ・ふゆうでもじめん技が当たる
 */
export const isGroundedByVolatile = (state: VolatileState): boolean => state.ingrain === true;

/**
 * タイプ相性の 0 倍を等倍として扱うか（防御側の一時的な状態による）
 * - みやぶる・かぎわける: ゴーストにノーマル・かくとう技が当たる
 * - ミラクルアイ: あくにエスパー技が当たる
 * - ねをはる: ひこうにじめん技が当たる
 */
export const ignoresTypeImmunityByVolatile = (
  defenderState: VolatileState,
  moveTypeName: string,
  defenderTypeName: string,
): boolean => {
  if (
    defenderState.foresight === true &&
    defenderTypeName === 'ゴースト' &&
    (moveTypeName === 'ノーマル' || moveTypeName === 'かくとう')
  ) {
    return true;
  }
  if (
    defenderState.miracleEye === true &&
    defenderTypeName === 'あく' &&
    moveTypeName === 'エスパー'
  ) {
    return true;
  }
  return (
    isGroundedByVolatile(defenderState) &&
    defenderTypeName === 'ひこう' &&
    moveTypeName === 'じめん'
  );
};

/**
 * 防御側の一時的な状態によるタイプ相性の倍率
 * - タールショット: ほのお技の相性が 2 倍
 * - でんじふゆう・テレキネシス: じめん技が当たらない（0 倍）
 */
export const typeEffectivenessMultiplierByVolatile = (
  defenderState: VolatileState,
  moveTypeName: string,
): number => {
  if (moveTypeName === 'じめん' && isLevitatingByVolatile(defenderState)) {
    return 0;
  }
  if (moveTypeName === 'ほのお' && defenderState.tarShot === true) {
    return 2;
  }
  return 1;
};

/**
 * 攻撃側の一時的な状態による威力の倍率（4096 分率の分子）
 * - じゅうでん・でんきにかえる・ふうりょくでんき（charged）: でんき技の威力が 2 倍
 * 補正がなければ undefined
 */
export const basePowerModifierByVolatile = (
  attackerState: VolatileState,
  moveTypeName: string,
): number | undefined =>
  attackerState.charged === true && moveTypeName === 'でんき' ? 8192 : undefined;

/**
 * 隠れている相手（そらをとぶ中のかぜおこし・あなをほる中のじしんなど）に当てたときのダメージの倍率
 */
export const semiInvulnerableDamageMultiplier = (
  defenderState: VolatileState,
  moveName: string | undefined,
): number => {
  const kind = defenderState.semiInvulnerable;
  if (kind === undefined || moveName === undefined) {
    return 1;
  }
  return MoveBehaviors.doublesAgainstSemiInvulnerable(kind, moveName) ? 2 : 1;
};

/**
 * 防御側の上がった回避ランクを無視するか（みやぶる・かぎわける・ミラクルアイ）
 */
export const ignoresPositiveEvasionByVolatile = (defenderState: VolatileState): boolean =>
  defenderState.foresight === true || defenderState.miracleEye === true;

/**
 * 必ず当たるか（使用者のロックオン・こころのめ、相手のテレキネシス）
 * 注: 一撃必殺技はテレキネシスでも必ずは当たらない（本家と同じ）が、ここでは区別しない
 */
export const alwaysHitsByVolatile = (
  attackerState: VolatileState,
  defenderState: VolatileState,
): boolean =>
  attackerState.lockOnTurns !== undefined || defenderState.telekinesisTurns !== undefined;
