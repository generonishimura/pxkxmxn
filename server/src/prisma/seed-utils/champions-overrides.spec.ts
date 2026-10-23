import {
  CHAMPIONS_MOVE_OVERRIDES,
  MoveOverride,
  applyMoveOverride,
  diffMoveOverride,
  findUnusedOverrideNames,
  resolveMoveOverride,
  toChampionsPp,
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
    // PP の決まりで値が変わらないように 20 にしておく（PP の決まりは別のテストで確かめる）
    pp: 20,
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
        'pp: 20 → 8',
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

    it('表にない技でも、PP はチャンピオンズの決まりで変わる', () => {
      // Arrange
      const table: Record<string, MoveOverride> = {};

      // Act
      const { seed: result, changes } = applyMoveOverride(seed({ pp: 10 }), table);

      // Assert
      expect(result).toEqual(seed({ pp: 12 }));
      expect(changes).toEqual(['pp: 10 → 12']);
    });

    it('表に PP がある技は、PP の決まりより表の値を使う', () => {
      // Arrange
      // まもる: SV は 10。決まりでは 12 だが、チャンピオンズは 8
      const table: Record<string, MoveOverride> = { まもる: { pp: 8 } };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed({ name: 'まもる', pp: 10 }), table);

      // Assert
      expect(result.pp).toBe(8);
      expect(changes).toEqual(['pp: 10 → 8']);
    });

    it('表に PP がない技は、表の項目に加えて PP の決まりも当たる', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { power: 90 } };

      // Act
      const { seed: result, changes } = applyMoveOverride(seed({ pp: 10 }), table);

      // Assert
      expect(result).toEqual(seed({ power: 90, pp: 12 }));
      expect(changes).toEqual(['power: 80 → 90', 'pp: 10 → 12']);
    });
  });

  describe('toChampionsPp', () => {
    it.each([
      [5, 8],
      [10, 12],
      [15, 16],
      [20, 20],
      [25, 20],
      [30, 20],
      [35, 20],
      [40, 20],
    ])('SV の PP %i は、チャンピオンズでは %i になる', (svPp, expected) => {
      // Act & Assert
      expect(toChampionsPp(svPp)).toBe(expected);
    });

    it('PP 1 の技（スケッチ・わるあがきなど、ポイントアップが効かない技）は 1 のまま', () => {
      // Act & Assert
      expect(toChampionsPp(1)).toBe(1);
    });

    it.each([8, 12, 16, 20])(
      'すでにチャンピオンズの値 %i になっている PP は、そのまま（もう一度当てても変わらない）',
      championsPp => {
        // Act & Assert
        expect(toChampionsPp(championsPp)).toBe(championsPp);
      },
    );
  });

  describe('resolveMoveOverride', () => {
    it('表にない技は、PP の決まりの値だけを返す', () => {
      // Act
      const override = resolveMoveOverride('たいあたり', 35, {});

      // Assert
      expect(override).toEqual({ pp: 20 });
    });

    it('表にある技は、表の値に PP の決まりの値を足して返す', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { りんごさん: { power: 90 } };

      // Act
      const override = resolveMoveOverride('りんごさん', 10, table);

      // Assert
      expect(override).toEqual({ power: 90, pp: 12 });
    });

    it('表に PP がある技は、表の PP を返す', () => {
      // Arrange
      const table: Record<string, MoveOverride> = { つじぎり: { pp: 20 } };

      // Act
      const override = resolveMoveOverride('つじぎり', 15, table);

      // Assert
      expect(override).toEqual({ pp: 20 });
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

  describe('CHAMPIONS_MOVE_OVERRIDES', () => {
    it('チャンピオンズで値が変わった技（Issue #259）と、PP の決まりの例外（Issue #260）が、チャンピオンズの値で入っている', () => {
      // Arrange
      // キーは DB の name（PokeAPI の ja-Hrkt 名）。Ｇのちからの Ｇ は全角
      const expected: Record<string, MoveOverride> = {
        りんごさん: { power: 90 },
        くちばしキャノン: { power: 120, pp: 8 },
        ボーンラッシュ: { power: 30 },
        クラブハンマー: { accuracy: 95 },
        ほのおのムチ: { power: 90 },
        であいがしら: { power: 100 },
        Ｇのちから: { power: 90 },
        ひゃっきやこう: { power: 65 },
        ナイトバースト: { power: 90 },
        ひょうざんおろし: { power: 120 },
        バリアーラッシュ: { power: 90 },
        かげぬい: { power: 90 },
        みずあめボム: { accuracy: 90 },
        トロピカルキック: { power: 85 },
        きりさく: { power: 80 },
        ねらいうち: { power: 85 },
        スターアサルト: { power: 170 },
        せいちょう: { typeName: 'grass' },
        トラバサミ: { typeName: 'steel' },
        ねがいごと: { pp: 8 },
        ちからをすいとる: { pp: 8 },
        ゴールドラッシュ: { accuracy: 95 },
        まもる: { pp: 8 },
        キングシールド: { pp: 8 },
        ニードルガード: { pp: 8 },
        トーチカ: { pp: 8 },
        ブロッキング: { pp: 8 },
        じょうか: { pp: 8 },
        すなあらし: { pp: 8 },
        ゆきげしき: { pp: 8 },
        つじぎり: { pp: 20 },
        トラップシェル: { pp: 12 },
        ホイールスピン: { pp: 12 },
      };

      // Act & Assert
      expect(CHAMPIONS_MOVE_OVERRIDES).toEqual(expected);
    });
  });
});
