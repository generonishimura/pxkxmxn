import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';
import {
  PrimalWeather,
  SideConditions,
  getGlobalFieldState,
  getSideConditions,
  swapCourtChangeConditions,
} from '@/modules/battle/domain/state/side-state';
import { MutableStatePatch, markRemoved } from '@/modules/battle/domain/state/state-field-parser';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * 場の状態を書く補助関数（天候・フィールド・設置技・陣営の状態の消去と入れ替え）
 * 技・特性は、Battle.weather / Battle.field を直接書かず、これを使う（残りターン数とゲンシ天候の決まりを守るため）
 */

/**
 * 天候・フィールドの既定の残りターン数（本家の duration。使ったターンを含む）
 */
export const DEFAULT_WEATHER_TURNS = 5;
export const DEFAULT_TERRAIN_TURNS = 5;

/**
 * ゲンシ天候のときの Battle.weather（ダメージ補正・ウェザーボールなどは、この天候として扱う）
 */
const PRIMAL_BASE_WEATHER: Readonly<Record<PrimalWeather, Weather>> = {
  heavyRain: Weather.Rain,
  harshSunlight: Weather.Sun,
  strongWinds: Weather.None,
};

/**
 * 最新のバトルを読む（コンテキストのバトルは、同じ行動の中で先に書いた天候を持たないことがある）
 */
const latestBattle = async (battleContext: BattleContext): Promise<Battle> =>
  (await battleContext.battleRepository?.findById(battleContext.battle.id)) ?? battleContext.battle;

/**
 * ふつうの天候（あめ・はれ・すなあらし・あられ）を出す（あまごい・あめふらしなど）
 * - すでに同じ天候、またはゲンシ天候の間は何もしない（ゲンシ天候はふつうの天候で上書きできない）
 * - GlobalFieldState.weatherTurns に turns を書く。ターン終了時に減らし、1 のターン終了時に天候を戻すのはエンジン
 * @param turns 残りターン数（既定 5。持ち物で 8 にするときなどに渡す）
 * @returns 天候を変えたら true
 */
export const setWeather = async (
  battleContext: BattleContext,
  weather: Weather,
  turns: number = DEFAULT_WEATHER_TURNS,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return false;
  }
  const battle = await latestBattle(battleContext);
  if (battle.weather === weather || getGlobalFieldState(battle.sideState).primalWeather) {
    return false;
  }
  await repository.update(battle.id, { weather });
  await repository.patchGlobalFieldState(battle.id, { weatherTurns: turns });
  return true;
};

/**
 * ゲンシ天候を出す（はじまりのうみ・おわりのだいち・デルタストリームの onEntry）
 * - 同じゲンシ天候なら何もしない。ふつうの天候・別のゲンシ天候は上書きする
 * - Battle.weather はおおあめなら Rain、おおひでりなら Sun、らんきりゅうなら None にする
 * - 残りターン数は持たない。holder が場を離れたら（交代・ひんし）エンジンが終わらせる
 *   （場に同じ特性のポケモンが残っていれば、そのポケモンに引き継ぐ）
 * @returns 天候を変えたら true
 */
export const setPrimalWeather = async (
  battleContext: BattleContext,
  holder: BattlePokemonStatus,
  kind: PrimalWeather,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return false;
  }
  const battle = await latestBattle(battleContext);
  if (getGlobalFieldState(battle.sideState).primalWeather === kind) {
    return false;
  }
  await repository.update(battle.id, { weather: PRIMAL_BASE_WEATHER[kind] });
  await repository.patchGlobalFieldState(battle.id, {
    primalWeather: kind,
    weatherSourceStatusId: holder.id,
    weatherTurns: null,
  });
  return true;
};

/**
 * フィールドを出す（エレキフィールド・エレキメイカーなど）
 * - すでに同じフィールドなら何もしない
 * - GlobalFieldState.terrainTurns に turns を書く。ターン終了時に減らし、1 のターン終了時にフィールドを戻すのはエンジン
 * @returns フィールドを変えたら true
 */
export const setTerrain = async (
  battleContext: BattleContext,
  field: Field,
  turns: number = DEFAULT_TERRAIN_TURNS,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return false;
  }
  const battle = await latestBattle(battleContext);
  if (battle.field === field) {
    return false;
  }
  await repository.update(battle.id, { field });
  await repository.patchGlobalFieldState(battle.id, { terrainTurns: turns });
  return true;
};

/**
 * 設置技の種類と、重ねられる上限
 */
export type EntryHazard = 'spikes' | 'toxicSpikes' | 'stealthRock' | 'stickyWeb';

const MAX_SPIKES_LAYERS = 3;
const MAX_TOXIC_SPIKES_LAYERS = 2;

/**
 * トレーナーの陣営に設置技を置く（まきびし・どくびし・ステルスロック・ねばねばネット・どくげしょう）
 * 技を使ったポケモンの相手の陣営（trainerId）に置く。上限（まきびし 3 層・どくびし 2 層・ほかは 1 つ）なら何もしない。
 * 場に出たポケモンへの効果はエンジンが与える
 * @returns 置いたら true（上限で置けなければ false。技は 'But it failed' を返す）
 */
export const addEntryHazard = async (
  battleContext: BattleContext,
  trainerId: number,
  hazard: EntryHazard,
): Promise<boolean> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return false;
  }
  const side = getSideConditions((await latestBattle(battleContext)).sideState, trainerId);
  const battleId = battleContext.battle.id;
  switch (hazard) {
    case 'spikes': {
      const layers = side.spikesLayers ?? 0;
      if (layers >= MAX_SPIKES_LAYERS) {
        return false;
      }
      await repository.patchSideConditions(battleId, trainerId, { spikesLayers: layers + 1 });
      return true;
    }
    case 'toxicSpikes': {
      const layers = side.toxicSpikesLayers ?? 0;
      if (layers >= MAX_TOXIC_SPIKES_LAYERS) {
        return false;
      }
      await repository.patchSideConditions(battleId, trainerId, { toxicSpikesLayers: layers + 1 });
      return true;
    }
    case 'stealthRock':
    case 'stickyWeb': {
      if (side[hazard] === true) {
        return false;
      }
      await repository.patchSideConditions(battleId, trainerId, { [hazard]: true });
      return true;
    }
  }
};

/**
 * トレーナーの陣営から、指定したキーを消す（こうそくスピン・きりばらい・バリアフリー・かわらわり）
 * 設置技は HAZARD_KEYS、壁は SCREEN_KEYS（side-state.ts）を渡す
 * @returns 実際に消したキー（もともとなかったキーは入らない）
 */
export const clearSideConditions = async (
  battleContext: BattleContext,
  trainerId: number,
  keys: ReadonlyArray<keyof SideConditions>,
): Promise<Array<keyof SideConditions>> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return [];
  }
  const side = getSideConditions((await latestBattle(battleContext)).sideState, trainerId);
  const removed = keys.filter(key => side[key] !== undefined);
  if (removed.length === 0) {
    return [];
  }
  const patch: MutableStatePatch<SideConditions> = {};
  for (const key of removed) {
    markRemoved(patch, key);
  }
  await repository.patchSideConditions(battleContext.battle.id, trainerId, patch);
  return removed;
};

/**
 * 2 つの陣営の壁・おいかぜ・しんぴのまもり・しろいきり・おまじない・設置技を入れ替える（コートチェンジ）
 * 入れ替えるのは COURT_CHANGE_KEYS だけ（ねがいごと・いやしのねがい・ガード系・選択待ちは残す）
 */
export const swapSideConditions = async (battleContext: BattleContext): Promise<void> => {
  const repository = battleContext.battleRepository;
  if (!repository) {
    return;
  }
  const battle = await latestBattle(battleContext);
  const swapped = swapCourtChangeConditions(battle.sideState, battle.trainer1Id, battle.trainer2Id);
  for (const trainerId of [battle.trainer1Id, battle.trainer2Id]) {
    const before = getSideConditions(battle.sideState, trainerId);
    const after = getSideConditions(swapped, trainerId);
    const patch: MutableStatePatch<SideConditions> = {};
    for (const key of Object.keys({ ...before, ...after }) as Array<keyof SideConditions>) {
      if (after[key] === undefined) {
        markRemoved(patch, key);
      } else {
        copyCondition(patch, after, key);
      }
    }
    await repository.patchSideConditions(battle.id, trainerId, patch);
  }
};

const copyCondition = <K extends keyof SideConditions>(
  patch: MutableStatePatch<SideConditions>,
  source: SideConditions,
  key: K,
): void => {
  patch[key] = source[key];
};
