import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Regulation } from '../regulations/regulation';

/**
 * 手持ちがレギュレーションに合わない理由
 * - speciesNotAllowed: レギュレーションで使えないポケモンがいる
 * - itemNotAllowed: レギュレーションで使えない持ち物を持つポケモンがいる
 */
export type RegulationProblem =
  | {
      readonly kind: 'speciesNotAllowed';
      readonly nationalDex: number;
      readonly pokemonName: string;
    }
  | { readonly kind: 'itemNotAllowed'; readonly item: string };

/**
 * 1 体がレギュレーションに合うかを確かめる（ポケモン → 持ち物の順に見る）
 */
const memberProblem = (
  member: TrainedPokemon,
  regulation: Regulation,
): RegulationProblem | undefined => {
  const { nationalDex, name } = member.pokemon;
  if (!regulation.allowedNationalDex.has(nationalDex)) {
    return { kind: 'speciesNotAllowed', nationalDex, pokemonName: name };
  }
  if (member.heldItem !== null && !regulation.allowedItems.has(member.heldItem)) {
    return { kind: 'itemNotAllowed', item: member.heldItem };
  }
  return undefined;
};

/**
 * 手持ちがレギュレーションに合うかを確かめる（手持ちの前から 1 体ずつ見て、最初の理由を返す）
 * @param team 手持ちの育成ポケモン
 * @param regulation 確かめるレギュレーション
 * @returns 合わなければその理由、合えば undefined
 */
export const findRegulationProblem = (
  team: readonly TrainedPokemon[],
  regulation: Regulation,
): RegulationProblem | undefined => {
  for (const member of team) {
    const problem = memberProblem(member, regulation);
    if (problem) {
      return problem;
    }
  }
  return undefined;
};

/**
 * 手持ちがレギュレーションに合わない理由のメッセージ（リクエストを弾くときに使う）
 */
export const regulationProblemMessage = (
  problem: RegulationProblem,
  regulation: Regulation,
): string => {
  switch (problem.kind) {
    case 'speciesNotAllowed':
      return `${problem.pokemonName} (National Pokédex number ${problem.nationalDex}) cannot be used in Regulation ${regulation.name}`;
    case 'itemNotAllowed':
      return `The held item ${problem.item} cannot be used in Regulation ${regulation.name}`;
  }
};
