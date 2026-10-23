import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { SideConditions } from '../state/side-state';
import { MEGA_EVOLUTIONS, MegaEvolution, findMegaEvolution } from './mega-evolutions';

/**
 * メガシンカできない理由
 * - alreadyMegaEvolved: すでにメガシンカした姿になっている
 * - alreadyUsed: トレーナーが、このバトルですでにメガシンカした（1 回のバトルで 1 回だけ）
 * - noMegaStone: その種族のメガストーンを持っていない
 */
export type MegaEvolutionProblem = 'alreadyMegaEvolved' | 'alreadyUsed' | 'noMegaStone';

/**
 * メガシンカできない理由ごとのメッセージ（リクエストを弾くときに使う）
 */
export const MEGA_EVOLUTION_PROBLEM_MESSAGES: Readonly<Record<MegaEvolutionProblem, string>> = {
  alreadyMegaEvolved: 'The active pokemon has already Mega Evolved',
  alreadyUsed: 'The trainer has already used Mega Evolution in this battle',
  noMegaStone: 'The active pokemon is not holding its Mega Stone',
};

/**
 * フォルムが、その種族のメガシンカした姿か
 * @param nationalDex 全国図鑑の番号（Pokemon.nationalDex）
 * @param form フォルム名（persistentState.form）
 */
export const isMegaForm = (nationalDex: number, form: string | undefined): boolean =>
  form !== undefined &&
  MEGA_EVOLUTIONS.some(mega => mega.nationalDex === nationalDex && mega.form === form);

/**
 * 場のポケモンがメガシンカできるかを確かめる
 * @param nationalDex ポケモンの全国図鑑の番号（Pokemon.nationalDex）
 * @param status 場のポケモン（持ち物は persistentState.item、今のフォルムは persistentState.form）
 * @param side ポケモンのトレーナーの陣営の状態（megaEvolved を見る）
 * @returns メガシンカできるなら mega（メガシンカした姿）、できないなら problem
 */
export const resolveMegaEvolution = (
  nationalDex: number,
  status: BattlePokemonStatus,
  side: SideConditions,
): { mega: MegaEvolution } | { problem: MegaEvolutionProblem } => {
  if (isMegaForm(nationalDex, status.persistentState.form)) {
    return { problem: 'alreadyMegaEvolved' };
  }
  if (side.megaEvolved === true) {
    return { problem: 'alreadyUsed' };
  }
  const mega = findMegaEvolution(nationalDex, status.persistentState.item);
  return mega ? { mega } : { problem: 'noMegaStone' };
};
