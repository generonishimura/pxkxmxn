import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';

/**
 * 育成ポケモンが選んだ技のルール
 * - 選んだ技は、その種族が覚える技でなければならない（pokemon_moves にある技）
 * 注: 4 つまで・同じ技を重ねないは、TrainedPokemon を作るときに確かめる
 * 注: 技を選んでいないポケモン（moveIds が空）は確かめない。バトルを始めるときに種族の覚える技から作る
 */

/**
 * 選んだ技がルールに合わない理由
 * - moveNotLearnable: その種族が覚えない技を選んでいる
 */
export type MoveRuleProblem = {
  readonly kind: 'moveNotLearnable';
  readonly pokemonName: string;
  readonly moveId: number;
};

/**
 * 手持ちの選んだ技がルールに合うかを確かめる（手持ちの前から 1 体ずつ、技を slot の順に見て、最初の理由を返す）
 * @param team 手持ちの育成ポケモン
 * @param learnableMoveIds 種族の ID（Pokemon.id）ごとの、覚える技の ID。ない種族は、覚える技がないとして扱う
 * @returns 合わなければその理由、合えば undefined
 */
export const findMoveRuleProblem = (
  team: readonly TrainedPokemon[],
  learnableMoveIds: ReadonlyMap<number, ReadonlySet<number>>,
): MoveRuleProblem | undefined => {
  for (const member of team) {
    const learnable = learnableMoveIds.get(member.pokemon.id);
    const moveId = member.moveIds.find(id => !learnable?.has(id));
    if (moveId !== undefined) {
      return { kind: 'moveNotLearnable', pokemonName: member.pokemon.name, moveId };
    }
  }
  return undefined;
};

/**
 * 選んだ技がルールに合わない理由のメッセージ（リクエストを弾くときに使う）
 */
export const moveRuleProblemMessage = (problem: MoveRuleProblem): string =>
  `${problem.pokemonName} cannot learn the move with ID ${problem.moveId}`;
