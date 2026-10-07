import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Battle, Field, Weather } from '@/modules/battle/domain/entities/battle.entity';
import { PrimalWeather, getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { BattleContext } from '../abilities/battle-context.interface';

/**
 * 場の状態を書く補助関数（天候・フィールド）
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
