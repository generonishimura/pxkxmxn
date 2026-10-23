import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { typeOf } from '../../application/__tests__/battle-engine-harness';
import { Nature } from './stat-calculator';
import { findTeamRuleProblem, teamRuleProblemMessage } from './team-rule';

describe('team-rule', () => {
  /**
   * 育成ポケモン 1 匹（id は TrainedPokemon の ID。全国図鑑の番号は省略すると id と同じ）
   */
  const member = (
    id: number,
    options: { nationalDex?: number; heldItem?: string | null } = {},
  ): TrainedPokemon =>
    new TrainedPokemon(
      id,
      1,
      new Pokemon(
        id,
        options.nationalDex ?? id,
        'テスト',
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
      options.heldItem ?? null,
    );

  const teamOf = (size: number): TrainedPokemon[] =>
    Array.from({ length: size }, (_, index) => member(index + 1));

  describe('findTeamRuleProblem', () => {
    it.each([3, 4, 5, 6])('%i 体のチームなら undefined を返す', size => {
      // Arrange
      const team = teamOf(size);

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toBeUndefined();
    });

    it.each([0, 1, 2, 7])('%i 体のチームなら teamSize を返す', size => {
      // Arrange
      const team = teamOf(size);

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toEqual({ kind: 'teamSize', size });
    });

    it('2 体が同じ持ち物を持っていれば、その持ち物の duplicateItem を返す', () => {
      // Arrange
      const team = [
        member(1, { heldItem: 'たべのこし' }),
        member(2, { heldItem: 'こだわりスカーフ' }),
        member(3, { heldItem: 'たべのこし' }),
      ];

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toEqual({ kind: 'duplicateItem', item: 'たべのこし' });
    });

    it('持ち物を持っていないポケモンが何体いても undefined を返す', () => {
      // Arrange
      const team = [member(1), member(2), member(3, { heldItem: 'たべのこし' }), member(4)];

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toBeUndefined();
    });

    it('全国図鑑の番号が同じポケモンが 2 体いれば、フォルムが違っても duplicateSpecies を返す（ヒートロトムとウォッシュロトム）', () => {
      // Arrange
      const team = [member(1, { nationalDex: 479 }), member(2), member(3, { nationalDex: 479 })];

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toEqual({ kind: 'duplicateSpecies', nationalDex: 479 });
    });

    it('数が合わないチームは、ほかの決まりより先に teamSize を返す', () => {
      // Arrange
      const team = [member(1, { heldItem: 'たべのこし' }), member(2, { heldItem: 'たべのこし' })];

      // Act
      const problem = findTeamRuleProblem(team);

      // Assert
      expect(problem).toEqual({ kind: 'teamSize', size: 2 });
    });
  });

  describe('teamRuleProblemMessage', () => {
    it.each([
      [{ kind: 'teamSize', size: 2 } as const, 'A team must have 3 to 6 pokemon. Got: 2'],
      [
        { kind: 'duplicateItem', item: 'たべのこし' } as const,
        'Two pokemon in a team cannot hold the same item: たべのこし',
      ],
      [
        { kind: 'duplicateSpecies', nationalDex: 479 } as const,
        'A team cannot have two pokemon with the same National Pokédex number: 479',
      ],
    ])('%o のメッセージを返す', (problem, message) => {
      // Act & Assert
      expect(teamRuleProblemMessage(problem)).toBe(message);
    });
  });
});
