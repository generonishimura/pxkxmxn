import { baseCriticalHitStage, criticalHitChance, rollCriticalHit } from './critical-hit';

describe('critical-hit', () => {
  describe('criticalHitChance', () => {
    it.each([
      [0, 1 / 24],
      [1, 1 / 8],
      [2, 1 / 2],
      [3, 1],
    ])('急所ランク %i の急所率は %d（第9世代）', (stage, expected) => {
      // Act
      const chance = criticalHitChance(stage);

      // Assert
      expect(chance).toBe(expected);
    });

    it('急所ランク 3 より上は、必ず急所として扱う', () => {
      // Act
      const chance = criticalHitChance(5);

      // Assert
      expect(chance).toBe(1);
    });

    it('急所ランクが負なら、ランク 0 として扱う', () => {
      // Act
      const chance = criticalHitChance(-1);

      // Assert
      expect(chance).toBe(1 / 24);
    });
  });

  describe('rollCriticalHit', () => {
    it('乱数が急所率より小さければ急所になる', () => {
      // Act
      const result = rollCriticalHit(1, () => 0.12);

      // Assert
      expect(result).toBe(true);
    });

    it('乱数が急所率以上なら急所にならない', () => {
      // Act
      const result = rollCriticalHit(1, () => 0.125);

      // Assert
      expect(result).toBe(false);
    });

    it('急所ランク 3 以上なら、乱数を引かずに急所になる', () => {
      // Arrange
      const random = jest.fn(() => 0.99);

      // Act
      const result = rollCriticalHit(3, random);

      // Assert
      expect(result).toBe(true);
      expect(random).not.toHaveBeenCalled();
    });
  });

  describe('baseCriticalHitStage', () => {
    it('ふつうの技は急所ランク 0', () => {
      // Act
      const stage = baseCriticalHitStage('たいあたり', {});

      // Assert
      expect(stage).toBe(0);
    });

    it('急所に当たりやすい技は急所ランク 1', () => {
      // Act
      const stage = baseCriticalHitStage('つじぎり', {});

      // Assert
      expect(stage).toBe(1);
    });

    it('きあいだめ（critStageBoost: 2）は急所ランクに 2 足す', () => {
      // Act
      const stage = baseCriticalHitStage('つじぎり', { critStageBoost: 2 });

      // Assert
      expect(stage).toBe(3);
    });

    it('とぎすます（laserFocusTurns）があれば必ず急所になるランクにする', () => {
      // Act
      const stage = baseCriticalHitStage('たいあたり', { laserFocusTurns: 1 });

      // Assert
      expect(stage).toBe(3);
    });

    it('必ず急所になる技は、必ず急所になるランクにする', () => {
      // Act
      const stage = baseCriticalHitStage('こおりのいぶき', {});

      // Assert
      expect(stage).toBe(3);
    });
  });
});
