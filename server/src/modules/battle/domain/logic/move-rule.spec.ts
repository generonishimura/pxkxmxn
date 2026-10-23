import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { typeOf } from '../../application/__tests__/battle-engine-harness';
import { Nature } from './stat-calculator';
import { findMoveRuleProblem, moveRuleProblemMessage } from './move-rule';

describe('move-rule', () => {
  /**
   * 育成ポケモン 1 匹（pokemonId は種族の ID）
   */
  const member = (pokemonId: number, moveIds: readonly number[]): TrainedPokemon =>
    new TrainedPokemon(
      pokemonId * 10,
      1,
      new Pokemon(
        pokemonId,
        pokemonId,
        `テスト${pokemonId}`,
        'Test',
        typeOf('ノーマル'),
        null,
        100,
        100,
        100,
        100,
        100,
        100,
      ),
      null,
      Gender.Male,
      Nature.Serious,
      null,
      0,
      0,
      0,
      0,
      0,
      0,
      null,
      moveIds,
    );

  describe('findMoveRuleProblem', () => {
    it('全員の技が、その種族の覚える技なら undefined を返す', () => {
      // Arrange
      const team = [member(1, [11, 12, 13, 14]), member(2, [21])];
      const learnable = new Map([
        [1, new Set([11, 12, 13, 14, 15])],
        [2, new Set([21, 22])],
      ]);

      // Act
      const problem = findMoveRuleProblem(team, learnable);

      // Assert
      expect(problem).toBeUndefined();
    });

    it('技を選んでいないポケモンは確かめない（覚える技が分からなくても undefined）', () => {
      // Arrange
      const team = [member(1, []), member(2, [])];

      // Act
      const problem = findMoveRuleProblem(team, new Map());

      // Assert
      expect(problem).toBeUndefined();
    });

    it('種族が覚えない技があれば moveNotLearnable を返す', () => {
      // Arrange
      const team = [member(1, [11]), member(2, [21, 99])];
      const learnable = new Map([
        [1, new Set([11])],
        [2, new Set([21])],
      ]);

      // Act
      const problem = findMoveRuleProblem(team, learnable);

      // Assert
      expect(problem).toEqual({
        kind: 'moveNotLearnable',
        pokemonName: 'テスト2',
        moveId: 99,
      });
    });

    it('種族の覚える技が分からなければ、選んだ技は覚えない技として扱う', () => {
      // Arrange
      const team = [member(3, [31])];

      // Act
      const problem = findMoveRuleProblem(team, new Map());

      // Assert
      expect(problem).toEqual({ kind: 'moveNotLearnable', pokemonName: 'テスト3', moveId: 31 });
    });

    it('覚えない技が何体にもあれば、手持ちの前のポケモンの理由を返す', () => {
      // Arrange
      const team = [member(1, [11, 98]), member(2, [99])];
      const learnable = new Map([
        [1, new Set([11])],
        [2, new Set<number>()],
      ]);

      // Act
      const problem = findMoveRuleProblem(team, learnable);

      // Assert
      expect(problem).toEqual({ kind: 'moveNotLearnable', pokemonName: 'テスト1', moveId: 98 });
    });
  });

  describe('moveRuleProblemMessage', () => {
    it('moveNotLearnable なら、ポケモンの名前と技の ID を書く', () => {
      // Act
      const message = moveRuleProblemMessage({
        kind: 'moveNotLearnable',
        pokemonName: 'ガブリアス',
        moveId: 99,
      });

      // Assert
      expect(message).toBe('ガブリアス cannot learn the move with ID 99');
    });
  });
});
