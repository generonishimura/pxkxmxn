/**
 * StatCalculator
 * TrainedPokemonから実際のステータスを計算するロジック
 *
 * ポケモンのステータス計算式:
 * - HP = floor((2 * baseHp + iv + floor(ev/4)) * level / 100) + level + 10
 * - それ以外 = floor((floor((2 * base + iv + floor(ev/4)) * level / 100) + 5) * nature)
 *
 * 性格による補正:
 * - 上げたいステータス: 1.1倍
 * - 下げたいステータス: 0.9倍
 * - それ以外: 1.0倍
 */

export enum Nature {
  Hardy = 'Hardy',
  Lonely = 'Lonely',
  Brave = 'Brave',
  Adamant = 'Adamant',
  Naughty = 'Naughty',
  Bold = 'Bold',
  Docile = 'Docile',
  Relaxed = 'Relaxed',
  Impish = 'Impish',
  Lax = 'Lax',
  Timid = 'Timid',
  Hasty = 'Hasty',
  Serious = 'Serious',
  Jolly = 'Jolly',
  Naive = 'Naive',
  Modest = 'Modest',
  Mild = 'Mild',
  Quiet = 'Quiet',
  Bashful = 'Bashful',
  Rash = 'Rash',
  Calm = 'Calm',
  Gentle = 'Gentle',
  Sassy = 'Sassy',
  Careful = 'Careful',
  Quirky = 'Quirky',
}

/**
 * TrainedPokemonのステータス情報
 */
export interface TrainedPokemonStats {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpecialAttack: number;
  baseSpecialDefense: number;
  baseSpeed: number;
  level: number;
  ivHp: number;
  ivAttack: number;
  ivDefense: number;
  ivSpecialAttack: number;
  ivSpecialDefense: number;
  ivSpeed: number;
  evHp: number;
  evAttack: number;
  evDefense: number;
  evSpecialAttack: number;
  evSpecialDefense: number;
  evSpeed: number;
  nature: Nature | null;
}

/**
 * 計算された実際のステータス
 */
export interface CalculatedStats {
  hp: number;
  attack: number;
  defense: number;
  specialAttack: number;
  specialDefense: number;
  speed: number;
}

export class StatCalculator {
  /**
   * TrainedPokemonのステータス情報から実際のステータスを計算
   */
  static calculate(stats: TrainedPokemonStats): CalculatedStats {
    return {
      hp: this.calculateHp(stats),
      attack: this.calculateStat(stats.baseAttack, stats.ivAttack, stats.evAttack, stats.level, stats.nature, 'attack'),
      defense: this.calculateStat(stats.baseDefense, stats.ivDefense, stats.evDefense, stats.level, stats.nature, 'defense'),
      specialAttack: this.calculateStat(stats.baseSpecialAttack, stats.ivSpecialAttack, stats.evSpecialAttack, stats.level, stats.nature, 'specialAttack'),
      specialDefense: this.calculateStat(stats.baseSpecialDefense, stats.ivSpecialDefense, stats.evSpecialDefense, stats.level, stats.nature, 'specialDefense'),
      speed: this.calculateStat(stats.baseSpeed, stats.ivSpeed, stats.evSpeed, stats.level, stats.nature, 'speed'),
    };
  }

  /**
   * HPを計算
   * HP = floor((2 * baseHp + iv + floor(ev/4)) * level / 100) + level + 10
   */
  private static calculateHp(stats: TrainedPokemonStats): number {
    return Math.floor((2 * stats.baseHp + stats.ivHp + Math.floor(stats.evHp / 4)) * stats.level / 100) + stats.level + 10;
  }

  /**
   * HP以外のステータスを計算
   * floor((floor((2 * base + iv + floor(ev/4)) * level / 100) + 5) * nature)
   */
  private static calculateStat(
    base: number,
    iv: number,
    ev: number,
    level: number,
    nature: Nature | null,
    statType: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
  ): number {
    const baseValue = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
    const natureMultiplier = this.getNatureMultiplier(nature, statType);
    return Math.floor(baseValue * natureMultiplier);
  }

  /**
   * 性格による補正を取得
   */
  private static getNatureMultiplier(
    nature: Nature | null,
    statType: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
  ): number {
    if (!nature) {
      return 1.0;
    }

    // 性格による補正テーブル
    // 上げるステータス: 1.1倍、下げるステータス: 0.9倍
    const natureModifiers: Record<Nature, { up: string; down: string }> = {
      [Nature.Hardy]: { up: 'attack', down: 'attack' },
      [Nature.Lonely]: { up: 'attack', down: 'defense' },
      [Nature.Brave]: { up: 'attack', down: 'speed' },
      [Nature.Adamant]: { up: 'attack', down: 'specialAttack' },
      [Nature.Naughty]: { up: 'attack', down: 'specialDefense' },
      [Nature.Bold]: { up: 'defense', down: 'attack' },
      [Nature.Docile]: { up: 'defense', down: 'defense' },
      [Nature.Relaxed]: { up: 'defense', down: 'speed' },
      [Nature.Impish]: { up: 'defense', down: 'specialAttack' },
      [Nature.Lax]: { up: 'defense', down: 'specialDefense' },
      [Nature.Timid]: { up: 'speed', down: 'attack' },
      [Nature.Hasty]: { up: 'speed', down: 'defense' },
      [Nature.Serious]: { up: 'speed', down: 'speed' },
      [Nature.Jolly]: { up: 'speed', down: 'specialAttack' },
      [Nature.Naive]: { up: 'speed', down: 'specialDefense' },
      [Nature.Modest]: { up: 'specialAttack', down: 'attack' },
      [Nature.Mild]: { up: 'specialAttack', down: 'defense' },
      [Nature.Quiet]: { up: 'specialAttack', down: 'speed' },
      [Nature.Bashful]: { up: 'specialAttack', down: 'specialAttack' },
      [Nature.Rash]: { up: 'specialAttack', down: 'specialDefense' },
      [Nature.Calm]: { up: 'specialDefense', down: 'attack' },
      [Nature.Gentle]: { up: 'specialDefense', down: 'defense' },
      [Nature.Sassy]: { up: 'specialDefense', down: 'speed' },
      [Nature.Careful]: { up: 'specialDefense', down: 'specialAttack' },
      [Nature.Quirky]: { up: 'specialDefense', down: 'specialDefense' },
    };

    const modifier = natureModifiers[nature];
    if (modifier.up === statType && modifier.down !== statType) {
      return 1.1;
    }
    if (modifier.down === statType && modifier.up !== statType) {
      return 0.9;
    }
    return 1.0;
  }
}

