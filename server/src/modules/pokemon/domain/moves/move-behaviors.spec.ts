import { MoveBehaviors } from './move-behaviors';

describe('MoveBehaviors', () => {
  it.each([
    ['げきりん', 'lockedMove'],
    ['はかいこうせん', 'recharge'],
    ['ソーラービーム', 'charge'],
    ['みらいよち', 'futureMove'],
    ['ねごと', 'sleepUsable'],
    ['つるぎのまい', 'snatch'],
    ['つるぎのまい', 'dance'],
    ['ほろびのうた', 'bypassSubstitute'],
    ['デカハンマー', 'cantUseTwice'],
    ['かえんぐるま', 'defrost'],
  ] as const)('%s は %s を持つ', (moveName, behavior) => {
    // Act
    const result = MoveBehaviors.has(moveName, behavior);

    // Assert
    expect(result).toBe(true);
  });

  it('ゆびをふるの候補に、ゆびをふる自身は入らない', () => {
    // Act
    const names = MoveBehaviors.namesWith('metronome');

    // Assert
    expect(names).toContain('かえんほうしゃ');
    expect(names).not.toContain('ゆびをふる');
  });

  it('第9世代で使えない技は、ゆびをふるの候補に入らない', () => {
    // Act
    const names = MoveBehaviors.namesWith('metronome');

    // Assert
    expect(names).not.toContain('からてチョップ');
  });

  describe('急所・まもる系・対象の範囲の性質', () => {
    it.each([
      ['つじぎり', 'highCritRatio'],
      ['３ぼんのや', 'highCritRatio'],
      ['こおりのいぶき', 'alwaysCrit'],
      ['すいりゅうれんだ', 'alwaysCrit'],
      ['フェイント', 'noProtect'],
      ['ほえる', 'noProtect'],
      ['フェイント', 'breaksProtect'],
      ['ゴーストダイブ', 'breaksProtect'],
      ['じしん', 'spread'],
      ['なきごえ', 'spread'],
    ] as const)('%s は %s を持つ', (moveName, behavior) => {
      // Act
      const result = MoveBehaviors.has(moveName, behavior);

      // Assert
      expect(result).toBe(true);
    });

    it.each([
      ['たいあたり', 'highCritRatio'],
      ['たいあたり', 'noProtect'],
      ['でんじは', 'noProtect'],
      ['たいあたり', 'spread'],
      ['ハイパードリル', 'breaksProtect'],
    ] as const)('%s は %s を持たない', (moveName, behavior) => {
      // Act
      const result = MoveBehaviors.has(moveName, behavior);

      // Assert
      expect(result).toBe(false);
    });

    it('namesWith で急所に当たりやすい技の一覧を引ける', () => {
      // Act
      const names = MoveBehaviors.namesWith('highCritRatio');

      // Assert
      expect(names).toContain('ストーンエッジ');
      expect(names).not.toContain('たいあたり');
    });

    it('表から引いた性質も残る（ゴーストダイブは charge と breaksProtect の両方を持つ）', () => {
      // Act
      const behaviors = MoveBehaviors.get('ゴーストダイブ');

      // Assert
      expect(behaviors.has('charge')).toBe(true);
      expect(behaviors.has('breaksProtect')).toBe(true);
    });
  });

  it('表にない技は性質を持たない', () => {
    // Act
    const behaviors = MoveBehaviors.get('存在しない技');

    // Assert
    expect(behaviors.size).toBe(0);
  });

  describe('ため技で隠れている相手', () => {
    it.each([
      ['そらをとぶ', 'air'],
      ['あなをほる', 'underground'],
      ['ダイビング', 'underwater'],
      ['ゴーストダイブ', 'vanished'],
    ] as const)('%s は %s に隠れる', (moveName, kind) => {
      // Act
      const result = MoveBehaviors.semiInvulnerableKind(moveName);

      // Assert
      expect(result).toBe(kind);
    });

    it('ソーラービームは隠れない', () => {
      // Act
      const result = MoveBehaviors.semiInvulnerableKind('ソーラービーム');

      // Assert
      expect(result).toBeUndefined();
    });

    it.each([
      ['air', 'かみなり', true],
      ['air', 'じしん', false],
      ['underground', 'じしん', true],
      ['underwater', 'なみのり', true],
      ['vanished', 'じしん', false],
    ] as const)('%s に %s が当たるかは %s', (kind, moveName, expected) => {
      // Act
      const result = MoveBehaviors.hitsSemiInvulnerable(kind, moveName);

      // Assert
      expect(result).toBe(expected);
    });

    it('そらをとぶ中の相手へのかぜおこしは 2 倍、かみなりは等倍', () => {
      // Act
      const gust = MoveBehaviors.doublesAgainstSemiInvulnerable('air', 'かぜおこし');
      const thunder = MoveBehaviors.doublesAgainstSemiInvulnerable('air', 'かみなり');

      // Assert
      expect(gust).toBe(true);
      expect(thunder).toBe(false);
    });
  });
});
