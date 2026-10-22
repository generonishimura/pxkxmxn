import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';

/**
 * 手持ち（同じトレーナーのポケモン）についての判定
 * 並びは BattlePokemonStatus の ID の順（バトル開始時にチームの順に作る）
 */

const byId = (a: BattlePokemonStatus, b: BattlePokemonStatus): number => a.id - b.id;

/**
 * 交代先にできるポケモン（控えにいて、ひんしでない）を ID の順に返す
 */
export const findSwitchTargets = (
  statuses: readonly BattlePokemonStatus[],
  trainerId: number,
): BattlePokemonStatus[] =>
  statuses.filter(s => s.trainerId === trainerId && !s.isActive && !s.isFainted()).sort(byId);

/**
 * 交代先にできない理由
 * - notFound: このバトルに、そのトレーナーのそのポケモンがいない（ほかのバトル・相手のポケモンも含む）
 * - alreadyActive: いま場にいる
 * - fainted: ひんし
 */
export type SwitchTargetProblem = 'notFound' | 'alreadyActive' | 'fainted';

/**
 * 交代先（TrainedPokemon の ID）を、このバトルのポケモンの一覧から探して確かめる
 * @param statuses このバトルのポケモンの一覧
 * @param trainerId 交代するトレーナー
 * @param trainedPokemonId 交代先の TrainedPokemon の ID
 * @returns 交代できるなら target、できないなら problem
 */
export const resolveSwitchTarget = (
  statuses: readonly BattlePokemonStatus[],
  trainerId: number,
  trainedPokemonId: number,
): { target: BattlePokemonStatus } | { problem: SwitchTargetProblem } => {
  const target = statuses.find(
    s => s.trainedPokemonId === trainedPokemonId && s.trainerId === trainerId,
  );
  if (!target) {
    return { problem: 'notFound' };
  }
  if (target.isActive) {
    return { problem: 'alreadyActive' };
  }
  if (target.isFainted()) {
    return { problem: 'fainted' };
  }
  return { target };
};

/**
 * ひんしの手持ち（さいきのいのりで復活させられるポケモン）を ID の順に返す
 */
export const findFaintedPartyMembers = (
  statuses: readonly BattlePokemonStatus[],
  trainerId: number,
): BattlePokemonStatus[] =>
  statuses.filter(s => s.trainerId === trainerId && s.isFainted()).sort(byId);

/**
 * 手持ちがひんしになった延べ数（そうだいしょう。本家の side.totalFainted）
 * 今ひんしの仲間の数に、さいきのいのりで復活した回数（persistentState.revivalCount）を足す。
 * 自分が前にひんしになって復活した回数も数える（自分は今ひんしではないので、今のひんしとしては数えない）。
 * 復活しても減らない（復活したポケモンがまたひんしになれば 2 と数える）
 */
export const countFaintedAllies = (
  statuses: readonly BattlePokemonStatus[],
  holder: BattlePokemonStatus,
): number =>
  statuses
    .filter(s => s.trainerId === holder.trainerId && s.id !== holder.id)
    .reduce(
      (count, s) => count + (s.isFainted() ? 1 : 0) + (s.persistentState.revivalCount ?? 0),
      holder.persistentState.revivalCount ?? 0,
    );

/**
 * HP が最大 HP の半分より上から、半分以下（ひんしを除く）になったか（ききかいひ・にげごし）
 * @param hpBefore ダメージを受ける前の HP
 */
export const crossesHalfHp = (pokemon: BattlePokemonStatus, hpBefore: number): boolean =>
  hpBefore > pokemon.maxHp / 2 && pokemon.currentHp <= pokemon.maxHp / 2 && pokemon.currentHp > 0;
