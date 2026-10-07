import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { StatePatch } from '@/modules/battle/domain/state/state-field-parser';
import { VolatileState } from '@/modules/battle/domain/state/volatile-state';
import { Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { BattleContext } from '../abilities/battle-context.interface';
import { EffectSource } from './effect-source';
import { getAbilityEffect, isIgnoredByMoldBreaker, resolveAbilityName } from './ability-lookup';
// 場の状態・設置技・交代の仕組み（Issue #110 #135 一部）
import { isProtectedBySafeguard, isYawnPreventedByTerrain } from './field-protection';

/**
 * 技・特性で付与する一時的な状態の種類と、その状態を表す VolatileState のキー
 * こんらん・ひるみは状態異常と同じく canInflictStatus / inflictStatus で付与する（StatusCondition.Confusion / Flinch）
 */
export const VOLATILE_KIND_KEYS = {
  taunt: 'tauntTurns', // ちょうはつ
  encore: 'encore', // アンコール
  disable: 'disable', // かなしばり・のろわれボディ
  torment: 'torment', // いちゃもん
  healBlock: 'healBlockTurns', // かいふくふうじ
  attract: 'infatuatedWithStatusId', // メロメロ・メロメロボディ
  yawn: 'yawnTurns', // あくび
  leechSeed: 'leechSeed', // やどりぎのタネ
  perishSong: 'perishCount', // ほろびのうた・ほろびのボディ
  nightmare: 'nightmare', // あくむ
  curse: 'cursed', // のろい（ゴースト）
  partialTrap: 'partialTrap', // しめつける・まきつく・ほのおのうずなど
  trap: 'trappedByStatusId', // くろいまなざし・とおせんぼう・クモのす
  octolock: 'octolock', // たこがため
  saltCure: 'saltCure', // しおづけ
  foresight: 'foresight', // みやぶる・かぎわける
  miracleEye: 'miracleEye', // ミラクルアイ
  tarShot: 'tarShot', // タールショット
  telekinesis: 'telekinesisTurns', // テレキネシス
  magnetRise: 'magnetRiseTurns', // でんじふゆう
  ingrain: 'ingrain', // ねをはる
  aquaRing: 'aquaRing', // アクアリング
  substitute: 'substituteHp', // みがわり
  throatChop: 'throatChopTurns', // じごくづき
  lockOn: 'lockOnTurns', // こころのめ・ロックオン
  charge: 'charged', // じゅうでん・でんきにかえる・ふうりょくでんき
  powder: 'powder', // ふんじん
  destinyBond: 'destinyBond', // みちづれ
  grudge: 'grudge', // おんねん
  imprison: 'imprison', // ふういん
  snatch: 'snatch', // よこどり
  laserFocus: 'laserFocusTurns', // とぎすます
  // 急所ランク・まもる系の仕組み（Issue #107 #111 一部）
  focusEnergy: 'critStageBoost', // きあいだめ
} as const satisfies Readonly<Record<string, keyof VolatileState>>;

/**
 * 一時的な状態の種類（アロマベール・どんかんの canReceiveVolatile に渡る）
 */
export type VolatileKind = keyof typeof VOLATILE_KIND_KEYS;

/**
 * 一時的な状態を付与するときのオプション
 */
export interface VolatileInflictionOptions {
  /** 付与したもの（技・特性と、そのポケモン）。メロメロは性別を比べるので必須 */
  readonly source?: EffectSource;
}

/**
 * やどりぎのタネを受けないタイプ
 */
const LEECH_SEED_IMMUNE_TYPE = 'くさ';

/**
 * 一時的な状態を付与できるかを判定する（書き込みはしない）
 *
 * 1. ひんしのポケモン、すでにその状態のポケモンには付与できない
 * 2. 状態ごとの決まり
 *    - やどりぎのタネ: くさタイプには付与できない
 *    - メロメロ: 付与元と性別が違わないと付与できない（どちらかが性別不明なら付与できない）
 *    - あくび: 状態異常があるか、ねむりを防ぐ特性（ふみん・やるき・スイートベールなど）なら付与できない。
 *      相手の陣営のしんぴのまもり・地面にいるポケモンのエレキフィールドでも付与できない
 * 3. 対象の特性の canReceiveVolatile（アロマベール・どんかん）。相手の技で付与するときは、かたやぶりで無視される
 *
 * 注: みがわりで防ぐかどうかは、エンジンが技の処理の中で判定する（相手を対象にする変化技は、
 *     MoveBehaviors の bypassSubstitute を持たなければみがわりに防がれる）
 */
export const canApplyVolatile = async (
  target: BattlePokemonStatus,
  kind: VolatileKind,
  battleContext: BattleContext,
  options: VolatileInflictionOptions = {},
): Promise<boolean> => {
  if (target.currentHp <= 0) {
    return false;
  }
  if (target.volatileState[VOLATILE_KIND_KEYS[kind]] !== undefined) {
    return false;
  }

  const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
    target.trainedPokemonId,
  );
  const targetTypes = [
    trainedPokemon?.pokemon.primaryType.name,
    trainedPokemon?.pokemon.secondaryType?.name,
  ];
  if (kind === 'leechSeed' && targetTypes.includes(LEECH_SEED_IMMUNE_TYPE)) {
    return false;
  }
  if (kind === 'attract' && !(await haveOppositeGenders(target, options.source, battleContext))) {
    return false;
  }
  // あくび: しんぴのまもり（相手が起こしたもの）・エレキフィールド（地面にいるポケモン）で防ぐ
  if (
    kind === 'yawn' &&
    ((await isProtectedBySafeguard(target, options.source, battleContext)) ||
      isYawnPreventedByTerrain(
        target,
        targetTypes.filter((name): name is string => name !== undefined),
        trainedPokemon?.ability?.name,
        battleContext,
      ))
  ) {
    return false;
  }

  const source = options.source;
  const targetAbilityName =
    trainedPokemon?.ability?.name ?? (await resolveAbilityName(target, battleContext));
  const byOpponentMove = source?.kind === 'move' && source.pokemon?.id !== target.id;
  if (byOpponentMove) {
    const sourceAbilityName =
      source.abilityName ??
      (source.pokemon ? await resolveAbilityName(source.pokemon, battleContext) : undefined);
    if (await isIgnoredByMoldBreaker(sourceAbilityName, targetAbilityName)) {
      return kind !== 'yawn' || !hasMajorStatus(target);
    }
  }

  const targetAbility = await getAbilityEffect(targetAbilityName);
  if (kind === 'yawn') {
    if (hasMajorStatus(target)) {
      return false;
    }
    const canSleep = targetAbility?.canReceiveStatusCondition?.(
      target,
      StatusCondition.Sleep,
      battleContext,
      source,
    );
    if (canSleep === false) {
      return false;
    }
  }
  return targetAbility?.canReceiveVolatile?.(target, kind, battleContext, source) !== false;
};

/**
 * 一時的な状態を書き込む（付与できるかは canApplyVolatile で先に判定しておく）
 * patch には、その状態のキーの値を入れる（例: ちょうはつは { tauntTurns: 3 }）
 * @returns 書き込んだあとのポケモン（リポジトリがなければ undefined）
 */
export const applyVolatile = async (
  target: BattlePokemonStatus,
  patch: StatePatch<VolatileState>,
  battleContext: BattleContext,
): Promise<BattlePokemonStatus | undefined> =>
  battleContext.battleRepository?.patchVolatileState(target.id, patch);

/**
 * 一時的な状態を付与できれば付与する（canApplyVolatile → applyVolatile）
 * @returns 付与したら true
 */
export const tryApplyVolatile = async (
  target: BattlePokemonStatus,
  kind: VolatileKind,
  patch: StatePatch<VolatileState>,
  battleContext: BattleContext,
  options: VolatileInflictionOptions = {},
): Promise<boolean> => {
  if (!battleContext.battleRepository) {
    return false;
  }
  if (!(await canApplyVolatile(target, kind, battleContext, options))) {
    return false;
  }
  await applyVolatile(target, patch, battleContext);
  return true;
};

const hasMajorStatus = (pokemon: BattlePokemonStatus): boolean =>
  pokemon.statusCondition !== null && pokemon.statusCondition !== StatusCondition.None;

/**
 * メロメロにできる組み合わせか（付与元と対象の性別が違い、どちらも性別不明でない）
 */
const haveOppositeGenders = async (
  target: BattlePokemonStatus,
  source: EffectSource | undefined,
  battleContext: BattleContext,
): Promise<boolean> => {
  if (!source?.pokemon || !battleContext.trainedPokemonRepository) {
    return false;
  }
  const [targetPokemon, sourcePokemon] = await Promise.all([
    battleContext.trainedPokemonRepository.findById(target.trainedPokemonId),
    battleContext.trainedPokemonRepository.findById(source.pokemon.trainedPokemonId),
  ]);
  const targetGender = targetPokemon?.gender;
  const sourceGender = sourcePokemon?.gender;
  if (!targetGender || !sourceGender) {
    return false;
  }
  if (targetGender === Gender.Genderless || sourceGender === Gender.Genderless) {
    return false;
  }
  return targetGender !== sourceGender;
};
