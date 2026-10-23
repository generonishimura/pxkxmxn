import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

/**
 * チャンピオンズのシングルバトルの手持ちのルール（レギュレーション M-C）
 * - 手持ちは 3〜6 体
 * - 同じ持ち物を 2 体以上に持たせられない（持ち物なしは何体でもよい）
 * - 全国図鑑の番号が同じポケモンを 2 体以上入れられない（フォルムが違っても同じ番号なら入れられない）
 * 出典: https://game8.co/games/Pokemon-Champions/archives/618064
 */
export const TEAM_SIZE_MIN = 3;
export const TEAM_SIZE_MAX = 6;

/**
 * 手持ちがルールに合わない理由
 * - teamSize: 手持ちの数が 3〜6 体でない
 * - duplicateItem: 2 体以上が同じ持ち物を持っている
 * - duplicateSpecies: 全国図鑑の番号が同じポケモンが 2 体以上いる
 */
export type TeamRuleProblem =
  | { readonly kind: 'teamSize'; readonly size: number }
  | { readonly kind: 'duplicateItem'; readonly item: string }
  | { readonly kind: 'duplicateSpecies'; readonly nationalDex: number };

/**
 * 値の並びの中で、最初に 2 回目が出てきた値（重複がなければ undefined）
 */
const firstDuplicate = <T>(values: readonly T[]): T | undefined => {
  const seen = new Set<T>();
  return values.find(value => {
    if (seen.has(value)) {
      return true;
    }
    seen.add(value);
    return false;
  });
};

/**
 * 手持ちがルールに合うかを確かめる（数 → 持ち物 → 全国図鑑の番号の順に見て、最初の理由を返す）
 * @param team 手持ちの育成ポケモン
 * @returns 合わなければその理由、合えば undefined
 */
export const findTeamRuleProblem = (
  team: readonly TrainedPokemon[],
): TeamRuleProblem | undefined => {
  if (team.length < TEAM_SIZE_MIN || team.length > TEAM_SIZE_MAX) {
    return { kind: 'teamSize', size: team.length };
  }
  const item = firstDuplicate(team.flatMap(member => (member.heldItem ? [member.heldItem] : [])));
  if (item !== undefined) {
    return { kind: 'duplicateItem', item };
  }
  const nationalDex = firstDuplicate(team.map(member => member.pokemon.nationalDex));
  if (nationalDex !== undefined) {
    return { kind: 'duplicateSpecies', nationalDex };
  }
  return undefined;
};

/**
 * 手持ちがルールに合わない理由のメッセージ（リクエストを弾くときに使う）
 */
export const teamRuleProblemMessage = (problem: TeamRuleProblem): string => {
  switch (problem.kind) {
    case 'teamSize':
      return `A team must have ${TEAM_SIZE_MIN} to ${TEAM_SIZE_MAX} pokemon. Got: ${problem.size}`;
    case 'duplicateItem':
      return `Two pokemon in a team cannot hold the same item: ${problem.item}`;
    case 'duplicateSpecies':
      return `A team cannot have two pokemon with the same National Pokédex number: ${problem.nationalDex}`;
  }
};
