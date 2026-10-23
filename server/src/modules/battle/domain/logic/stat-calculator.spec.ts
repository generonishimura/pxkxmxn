import { StatCalculator, TrainedPokemonStats, Nature } from './stat-calculator';

describe('StatCalculator', () => {
  // テスト用のヘルパー関数（種族値 100・能力ポイント 0・補正なし）
  const createTrainedPokemonStats = (
    overrides?: Partial<TrainedPokemonStats>,
  ): TrainedPokemonStats => {
    return {
      baseHp: 100,
      baseAttack: 100,
      baseDefense: 100,
      baseSpecialAttack: 100,
      baseSpecialDefense: 100,
      baseSpeed: 100,
      spHp: 0,
      spAttack: 0,
      spDefense: 0,
      spSpecialAttack: 0,
      spSpecialDefense: 0,
      spSpeed: 0,
      nature: null,
      ...overrides,
    };
  };

  describe('calculate - HP計算', () => {
    it('HP = 種族値 + 能力ポイント + 75', () => {
      const stats = createTrainedPokemonStats({ baseHp: 100, spHp: 32 });

      const result = StatCalculator.calculate(stats);

      // 100 + 32 + 75 = 207
      expect(result.hp).toBe(207);
    });

    it('能力ポイントが 0 なら、HP = 種族値 + 75', () => {
      const stats = createTrainedPokemonStats({ baseHp: 108, spHp: 0 });

      const result = StatCalculator.calculate(stats);

      expect(result.hp).toBe(183);
    });

    it('HP は能力補正の影響を受けない', () => {
      const stats = createTrainedPokemonStats({ baseHp: 100, spHp: 10, nature: Nature.Lonely });

      const result = StatCalculator.calculate(stats);

      expect(result.hp).toBe(185);
    });
  });

  describe('calculate - HP以外の計算', () => {
    it('補正なしなら、能力値 = 種族値 + 能力ポイント + 20', () => {
      const stats = createTrainedPokemonStats({ baseAttack: 130, spAttack: 32 });

      const result = StatCalculator.calculate(stats);

      // 130 + 32 + 20 = 182
      expect(result.attack).toBe(182);
    });

    it('上がる能力は 1.1 倍して切り捨てる', () => {
      const stats = createTrainedPokemonStats({
        baseSpeed: 102,
        spSpeed: 32,
        nature: Nature.Jolly,
      });

      const result = StatCalculator.calculate(stats);

      // floor((102 + 32 + 20) × 1.1) = floor(169.4) = 169
      expect(result.speed).toBe(169);
    });

    it('下がる能力は 0.9 倍して切り捨てる', () => {
      const stats = createTrainedPokemonStats({
        baseSpecialAttack: 80,
        spSpecialAttack: 0,
        nature: Nature.Jolly,
      });

      const result = StatCalculator.calculate(stats);

      // floor((80 + 0 + 20) × 0.9) = 90
      expect(result.specialAttack).toBe(90);
    });

    it('ガブリアス（ようき・攻撃 32・素早さ 32・HP 2）の能力値がすべて合う', () => {
      // ガブリアスの種族値: 108 / 130 / 95 / 80 / 85 / 102
      const stats = createTrainedPokemonStats({
        baseHp: 108,
        baseAttack: 130,
        baseDefense: 95,
        baseSpecialAttack: 80,
        baseSpecialDefense: 85,
        baseSpeed: 102,
        spHp: 2,
        spAttack: 32,
        spSpeed: 32,
        nature: Nature.Jolly,
      });

      const result = StatCalculator.calculate(stats);

      expect(result).toEqual({
        hp: 185, // 108 + 2 + 75
        attack: 182, // 130 + 32 + 20
        defense: 115, // 95 + 0 + 20
        specialAttack: 90, // floor(100 × 0.9)
        specialDefense: 105, // 85 + 0 + 20
        speed: 169, // floor(154 × 1.1)
      });
    });

    it('能力ポイントが多いほど能力値が高くなる', () => {
      const low = StatCalculator.calculate(createTrainedPokemonStats({ spDefense: 0 }));
      const high = StatCalculator.calculate(createTrainedPokemonStats({ spDefense: 1 }));

      expect(high.defense).toBe(low.defense + 1);
    });
  });

  describe('calculate - 能力補正', () => {
    it('能力補正が null なら、すべて 1.0 倍', () => {
      const result = StatCalculator.calculate(createTrainedPokemonStats({ nature: null }));

      expect(result).toEqual({
        hp: 175,
        attack: 120,
        defense: 120,
        specialAttack: 120,
        specialDefense: 120,
        speed: 120,
      });
    });

    it('まじめ（補正なし）なら、すべて 1.0 倍', () => {
      const neutral = StatCalculator.calculate(createTrainedPokemonStats({ nature: null }));
      const serious = StatCalculator.calculate(
        createTrainedPokemonStats({ nature: Nature.Serious }),
      );

      expect(serious).toEqual(neutral);
    });

    it.each([
      [Nature.Lonely, 'attack', 'defense'],
      [Nature.Adamant, 'attack', 'specialAttack'],
      [Nature.Bold, 'defense', 'attack'],
      [Nature.Timid, 'speed', 'attack'],
      [Nature.Jolly, 'speed', 'specialAttack'],
      [Nature.Modest, 'specialAttack', 'attack'],
      [Nature.Calm, 'specialDefense', 'attack'],
      [Nature.Careful, 'specialDefense', 'specialAttack'],
    ] as const)('%s は %s を 1.1 倍、%s を 0.9 倍にする', (nature, up, down) => {
      const result = StatCalculator.calculate(createTrainedPokemonStats({ nature }));

      // 種族値 100・能力ポイント 0 → 補正前は 120
      expect(result[up]).toBe(132);
      expect(result[down]).toBe(108);
    });
  });
});
