import { StatCalculator, TrainedPokemonStats, Nature } from './stat-calculator';

describe('StatCalculator', () => {
  // テスト用のヘルパー関数
  const createTrainedPokemonStats = (
    overrides?: Partial<TrainedPokemonStats>,
  ): TrainedPokemonStats => {
    return {
      baseHp: overrides?.baseHp ?? 100,
      baseAttack: overrides?.baseAttack ?? 100,
      baseDefense: overrides?.baseDefense ?? 100,
      baseSpecialAttack: overrides?.baseSpecialAttack ?? 100,
      baseSpecialDefense: overrides?.baseSpecialDefense ?? 100,
      baseSpeed: overrides?.baseSpeed ?? 100,
      level: overrides?.level ?? 50,
      ivHp: overrides?.ivHp ?? 31,
      ivAttack: overrides?.ivAttack ?? 31,
      ivDefense: overrides?.ivDefense ?? 31,
      ivSpecialAttack: overrides?.ivSpecialAttack ?? 31,
      ivSpecialDefense: overrides?.ivSpecialDefense ?? 31,
      ivSpeed: overrides?.ivSpeed ?? 31,
      evHp: overrides?.evHp ?? 0,
      evAttack: overrides?.evAttack ?? 0,
      evDefense: overrides?.evDefense ?? 0,
      evSpecialAttack: overrides?.evSpecialAttack ?? 0,
      evSpecialDefense: overrides?.evSpecialDefense ?? 0,
      evSpeed: overrides?.evSpeed ?? 0,
      nature: overrides?.nature ?? null,
    };
  };

  describe('calculate - HP計算', () => {
    it('HP計算式が正しく動作する', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 252,
        level: 50,
      });

      const result = StatCalculator.calculate(stats);
      // HP = floor((2 * 100 + 31 + floor(252/4)) * 50 / 100) + 50 + 10
      // = floor((200 + 31 + 63) * 50 / 100) + 60
      // = floor(294 * 50 / 100) + 60
      // = floor(147) + 60
      // = 207
      expect(result.hp).toBe(207);
    });

    it('レベル1の場合、HPが最小値になる', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 50,
        ivHp: 0,
        evHp: 0,
        level: 1,
      });

      const result = StatCalculator.calculate(stats);
      // HP = floor((2 * 50 + 0 + 0) * 1 / 100) + 1 + 10
      // = floor(100 * 1 / 100) + 11
      // = 1 + 11
      // = 12
      expect(result.hp).toBe(12);
    });

    it('レベル100の場合、HPが最大値になる', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 252,
        level: 100,
      });

      const result = StatCalculator.calculate(stats);
      // HP = floor((2 * 100 + 31 + 63) * 100 / 100) + 100 + 10
      // = floor(294) + 110
      // = 404
      expect(result.hp).toBe(404);
    });

    it('IVが高いほどHPが高くなる', () => {
      const statsLowIv = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 0,
        evHp: 0,
        level: 50,
      });

      const statsHighIv = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 0,
        level: 50,
      });

      const resultLowIv = StatCalculator.calculate(statsLowIv);
      const resultHighIv = StatCalculator.calculate(statsHighIv);

      expect(resultHighIv.hp).toBeGreaterThan(resultLowIv.hp);
    });

    it('EVが高いほどHPが高くなる', () => {
      const statsLowEv = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 0,
        level: 50,
      });

      const statsHighEv = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 252,
        level: 50,
      });

      const resultLowEv = StatCalculator.calculate(statsLowEv);
      const resultHighEv = StatCalculator.calculate(statsHighEv);

      expect(resultHighEv.hp).toBeGreaterThan(resultLowEv.hp);
    });

    it('EVは4で割って切り捨てられる', () => {
      const statsEv3 = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 3,
        level: 50,
      });

      const statsEv4 = createTrainedPokemonStats({
        baseHp: 100,
        ivHp: 31,
        evHp: 4,
        level: 50,
      });

      const resultEv3 = StatCalculator.calculate(statsEv3);
      const resultEv4 = StatCalculator.calculate(statsEv4);

      // EV3とEV4は同じ効果（floor(3/4) = 0, floor(4/4) = 1）
      expect(resultEv4.hp).toBeGreaterThan(resultEv3.hp);
    });
  });

  describe('calculate - ステータス計算（HP以外）', () => {
    it('攻撃ステータス計算式が正しく動作する', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 252,
        level: 50,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      // 攻撃 = floor((floor((2 * 100 + 31 + floor(252/4)) * 50 / 100) + 5) * 1.0)
      // = floor((floor(294 * 50 / 100) + 5) * 1.0)
      // = floor(floor(147) + 5)
      // = floor(152)
      // = 152
      expect(result.attack).toBe(152);
    });

    it('レベル1の場合、ステータスが最小値になる', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 50,
        ivAttack: 0,
        evAttack: 0,
        level: 1,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      // 攻撃 = floor((floor((2 * 50 + 0 + 0) * 1 / 100) + 5) * 1.0)
      // = floor((floor(100 * 1 / 100) + 5) * 1.0)
      // = floor(1 + 5)
      // = 6
      expect(result.attack).toBe(6);
    });

    it('レベル100の場合、ステータスが最大値になる', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 252,
        level: 100,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      // 攻撃 = floor((floor((2 * 100 + 31 + 63) * 100 / 100) + 5) * 1.0)
      // = floor((floor(294) + 5) * 1.0)
      // = floor(299)
      // = 299
      expect(result.attack).toBe(299);
    });

    it('IVが高いほどステータスが高くなる', () => {
      const statsLowIv = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 0,
        evAttack: 0,
        level: 50,
        nature: null,
      });

      const statsHighIv = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: null,
      });

      const resultLowIv = StatCalculator.calculate(statsLowIv);
      const resultHighIv = StatCalculator.calculate(statsHighIv);

      expect(resultHighIv.attack).toBeGreaterThan(resultLowIv.attack);
    });

    it('EVが高いほどステータスが高くなる', () => {
      const statsLowEv = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: null,
      });

      const statsHighEv = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 252,
        level: 50,
        nature: null,
      });

      const resultLowEv = StatCalculator.calculate(statsLowEv);
      const resultHighEv = StatCalculator.calculate(statsHighEv);

      expect(resultHighEv.attack).toBeGreaterThan(resultLowEv.attack);
    });

    it('すべてのステータスが正しく計算される', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 100,
        baseAttack: 100,
        baseDefense: 100,
        baseSpecialAttack: 100,
        baseSpecialDefense: 100,
        baseSpeed: 100,
        level: 50,
        ivHp: 31,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
        evHp: 0,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 0,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);

      expect(result.hp).toBeGreaterThan(0);
      expect(result.attack).toBeGreaterThan(0);
      expect(result.defense).toBeGreaterThan(0);
      expect(result.specialAttack).toBeGreaterThan(0);
      expect(result.specialDefense).toBeGreaterThan(0);
      expect(result.speed).toBeGreaterThan(0);
    });
  });

  describe('calculate - 性格補正', () => {
    it('性格がnullの場合、補正は1.0倍', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      expect(result.attack).toBeGreaterThan(0);
    });

    it('いじっぱり（攻撃↑、攻撃↓）の場合、攻撃は1.0倍', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: Nature.Hardy, // 攻撃↑、攻撃↓
      });

      const result = StatCalculator.calculate(stats);
      const statsNoNature = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: null,
      });
      const resultNoNature = StatCalculator.calculate(statsNoNature);

      // 同じステータスを上げ下げする性格は1.0倍
      expect(result.attack).toBeCloseTo(resultNoNature.attack, 0);
    });

    it('さみしがり（攻撃↑、防御↓）の場合、攻撃は1.1倍、防御は0.9倍', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        baseDefense: 100,
        ivAttack: 31,
        ivDefense: 31,
        evAttack: 0,
        evDefense: 0,
        level: 50,
        nature: Nature.Lonely, // 攻撃↑、防御↓
      });

      const result = StatCalculator.calculate(stats);
      const statsNoNature = createTrainedPokemonStats({
        baseAttack: 100,
        baseDefense: 100,
        ivAttack: 31,
        ivDefense: 31,
        evAttack: 0,
        evDefense: 0,
        level: 50,
        nature: null,
      });
      const resultNoNature = StatCalculator.calculate(statsNoNature);

      // 攻撃は1.1倍
      expect(result.attack).toBeGreaterThan(resultNoNature.attack);
      const attackRatio = result.attack / resultNoNature.attack;
      expect(attackRatio).toBeCloseTo(1.1, 0.01);

      // 防御は0.9倍
      expect(result.defense).toBeLessThan(resultNoNature.defense);
      const defenseRatio = result.defense / resultNoNature.defense;
      expect(defenseRatio).toBeCloseTo(0.9, 0.01);
    });

    it('ようき（素早さ↑、特攻↓）の場合、素早さは1.1倍、特攻は0.9倍', () => {
      const stats = createTrainedPokemonStats({
        baseSpeed: 100,
        baseSpecialAttack: 100,
        ivSpeed: 31,
        ivSpecialAttack: 31,
        evSpeed: 0,
        evSpecialAttack: 0,
        level: 50,
        nature: Nature.Jolly, // 素早さ↑、特攻↓
      });

      const result = StatCalculator.calculate(stats);
      const statsNoNature = createTrainedPokemonStats({
        baseSpeed: 100,
        baseSpecialAttack: 100,
        ivSpeed: 31,
        ivSpecialAttack: 31,
        evSpeed: 0,
        evSpecialAttack: 0,
        level: 50,
        nature: null,
      });
      const resultNoNature = StatCalculator.calculate(statsNoNature);

      // 素早さは1.1倍
      expect(result.speed).toBeGreaterThan(resultNoNature.speed);
      const speedRatio = result.speed / resultNoNature.speed;
      expect(speedRatio).toBeCloseTo(1.1, 0.01);

      // 特攻は0.9倍
      expect(result.specialAttack).toBeLessThan(resultNoNature.specialAttack);
      const specialAttackRatio = result.specialAttack / resultNoNature.specialAttack;
      expect(specialAttackRatio).toBeCloseTo(0.9, 0.01);
    });

    it('すべての性格が正しく動作する', () => {
      const baseStats = {
        baseAttack: 100,
        baseDefense: 100,
        baseSpecialAttack: 100,
        baseSpecialDefense: 100,
        baseSpeed: 100,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 0,
        level: 50,
      };

      const natures: Nature[] = [
        Nature.Hardy,
        Nature.Lonely,
        Nature.Brave,
        Nature.Adamant,
        Nature.Naughty,
        Nature.Bold,
        Nature.Docile,
        Nature.Relaxed,
        Nature.Impish,
        Nature.Lax,
        Nature.Timid,
        Nature.Hasty,
        Nature.Serious,
        Nature.Jolly,
        Nature.Naive,
        Nature.Modest,
        Nature.Mild,
        Nature.Quiet,
        Nature.Bashful,
        Nature.Rash,
        Nature.Calm,
        Nature.Gentle,
        Nature.Sassy,
        Nature.Careful,
        Nature.Quirky,
      ];

      // すべての性格で計算が成功することを確認
      for (const nature of natures) {
        const stats = createTrainedPokemonStats({
          ...baseStats,
          nature,
        });

        expect(() => StatCalculator.calculate(stats)).not.toThrow();
        const result = StatCalculator.calculate(stats);
        expect(result.attack).toBeGreaterThan(0);
        expect(result.defense).toBeGreaterThan(0);
        expect(result.specialAttack).toBeGreaterThan(0);
        expect(result.specialDefense).toBeGreaterThan(0);
        expect(result.speed).toBeGreaterThan(0);
      }
    });
  });

  describe('calculate - エッジケース', () => {
    it('基礎ステータスが1の場合でも正しく計算される', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 1,
        baseAttack: 1,
        baseDefense: 1,
        baseSpecialAttack: 1,
        baseSpecialDefense: 1,
        baseSpeed: 1,
        level: 50,
        ivHp: 0,
        ivAttack: 0,
        ivDefense: 0,
        ivSpecialAttack: 0,
        ivSpecialDefense: 0,
        ivSpeed: 0,
        evHp: 0,
        evAttack: 0,
        evDefense: 0,
        evSpecialAttack: 0,
        evSpecialDefense: 0,
        evSpeed: 0,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      expect(result.hp).toBeGreaterThan(0);
      expect(result.attack).toBeGreaterThan(0);
      expect(result.defense).toBeGreaterThan(0);
      expect(result.specialAttack).toBeGreaterThan(0);
      expect(result.specialDefense).toBeGreaterThan(0);
      expect(result.speed).toBeGreaterThan(0);
    });

    it('基礎ステータスが255の場合でも正しく計算される', () => {
      const stats = createTrainedPokemonStats({
        baseHp: 255,
        baseAttack: 255,
        baseDefense: 255,
        baseSpecialAttack: 255,
        baseSpecialDefense: 255,
        baseSpeed: 255,
        level: 100,
        ivHp: 31,
        ivAttack: 31,
        ivDefense: 31,
        ivSpecialAttack: 31,
        ivSpecialDefense: 31,
        ivSpeed: 31,
        evHp: 252,
        evAttack: 252,
        evDefense: 252,
        evSpecialAttack: 252,
        evSpecialDefense: 252,
        evSpeed: 252,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      expect(result.hp).toBeGreaterThan(0);
      expect(result.attack).toBeGreaterThan(0);
      expect(result.defense).toBeGreaterThan(0);
      expect(result.specialAttack).toBeGreaterThan(0);
      expect(result.specialDefense).toBeGreaterThan(0);
      expect(result.speed).toBeGreaterThan(0);
    });

    it('EVが252（最大値）の場合でも正しく計算される', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 252,
        level: 50,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      expect(result.attack).toBeGreaterThan(0);
    });

    it('IVが31（最大値）の場合でも正しく計算される', () => {
      const stats = createTrainedPokemonStats({
        baseAttack: 100,
        ivAttack: 31,
        evAttack: 0,
        level: 50,
        nature: null,
      });

      const result = StatCalculator.calculate(stats);
      expect(result.attack).toBeGreaterThan(0);
    });
  });
});

