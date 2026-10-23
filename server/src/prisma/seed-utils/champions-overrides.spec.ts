import {
  MoveOverride,
  applyMoveOverride,
  diffMoveOverride,
  findUnusedOverrideNames,
} from '../../../prisma/seed-utils/champions-overrides';
import { MoveSeedData } from '../../../prisma/seed-utils/data-mapper';

describe('champions-overrides', () => {
  const seed = (overrides: Partial<MoveSeedData> = {}): MoveSeedData => ({
    name: 'りんごさん',
    nameEn: 'Apple Acid',
    typeName: 'grass',
    category: 'Special',
    power: 80,
    accuracy: 100,
    pp: 10,
    priority: 0,
    description: null,
    ...overrides,
  });

  describe('applyMoveOverride', () => {
    it('上書きの表にある技は、表の値に変わる', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { power: 90 } };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed(), table);

      // Assert
      expect(result.power).toBe(90);
      expect(changes).toEqual(['power: 80 → 90']);
    });

    it('表に書いていない項目は、PokeAPI の値のまま', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { power: 90 } };

      // Act
      const { seed: result } = applyMoveOverride(seed(), table);

      // Assert
      expect(result).toEqual({ ...seed(), power: 90 });
    });

    it('タイプ・命中・PP・優先度もまとめて上書きできる', () => {
      // Arrange
      const table: Record<string, MoveOverride> = {
        りんごさん: { typeName: 'steel', accuracy: 95, pp: 8, priority: 1 },
      };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed(), table);

      // Assert
      expect(result).toMatchObject({ typeName: 'steel', accuracy: 95, pp: 8, priority: 1 });
      expect(changes).toEqual([
        'typeName: grass → steel',
        'accuracy: 100 → 95',
        'pp: 10 → 8',
        'priority: 0 → 1',
      ]);
    });

    it('威力・命中を null（なし）に上書きできる', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { accuracy: null } };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed(), table);

      // Assert
      expect(result.accuracy).toBeNull();
      expect(changes).toEqual(['accuracy: 100 → null']);
    });

    it('表にない技は、何も変わらない', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { くちばしキャノン: { power: 120 } };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed(), table);

      // Assert
      expect(result).toEqual(seed());
      expect(changes).toEqual([]);
    });

    it('表の値が PokeAPI の値と同じなら、変更として数えない', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { power: 80 } };

      // Act
      const { changes } = applyMoveOverride(seed(), table);

      // Assert
      expect(changes).toEqual([]);
    });
  });

  describe('diffMoveOverride', () => {
    it('DB の今の値と比べて、変わる項目と変わったあとの値を返す', () => {
      // Arrange
      const current = { power: 100, accuracy: 100, pp: 10, typeName: 'flying', priority: -3 };

      // Act
      const { next, changes } = diffMoveOverride(current, { power: 120 });

      // Assert
      expect(next).toEqual({ ...current, power: 120 });
      expect(changes).toEqual(['power: 100 → 120']);
    });
  });

  describe('findUnusedOverrideNames', () => {
    it('どの技にも当たらなかったキーを返す（名前の書き間違いを見つける）', () => {
      // Arrange
      const table: Record<string, MoveOverride> = {
        りんごさん: { power: 90 },
        りんごさｎ: { power: 90 },
      };

      // Act
      const unused = findUnusedOverrideNames(table, new Set(['りんごさん']));

      // Assert
      expect(unused).toEqual(['りんごさｎ']);
    });
  });
});
