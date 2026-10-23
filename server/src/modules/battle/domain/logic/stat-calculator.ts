/**
 * StatCalculator
 * TrainedPokemonから実際のステータスを計算するロジック
 *
 * チャンピオンズの能力値の計算式（レベルは 50 に固定。個体値・努力値はない）:
 * - HP = 種族値 + 能力ポイント + 75
 * - それ以外 = floor((種族値 + 能力ポイント + 20) * 能力補正)
 *
 * 能力補正（性格）:
 * - 上がる能力: 1.1倍
 * - 下がる能力: 0.9倍
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
 * TrainedPokemonのステータス情報（種族値・能力ポイント・能力補正）
 */
export interface TrainedPokemonStats {
  baseHp: number;
  baseAttack: number;
  baseDefense: number;
  baseSpecialAttack: number;
  baseSpecialDefense: number;
  baseSpeed: number;
  spHp: number;
  spAttack: number;
  spDefense: number;
  spSpecialAttack: number;
  spSpecialDefense: number;
  spSpeed: number;
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
   * HP の計算式で足す値（種族値 + 能力ポイント + 75 の 75）
   */
  private static readonly HP_STAT_OFFSET = 75;

  /**
   * HP 以外の計算式で足す値（種族値 + 能力ポイント + 20 の 20）
   */
  private static readonly NON_HP_STAT_OFFSET = 20;

  /**
   * 性格による補正：上げたいステータスの倍率
   */
  private static readonly NATURE_UP_MULTIPLIER = 1.1;

  /**
   * 性格による補正：下げたいステータスの倍率
   */
  private static readonly NATURE_DOWN_MULTIPLIER = 0.9;

  /**
   * 性格による補正：変化なしの倍率
   */
  private static readonly NATURE_NEUTRAL_MULTIPLIER = 1.0;

  /**
   * TrainedPokemonのステータス情報から実際のステータスを計算
   */
  static calculate(stats: TrainedPokemonStats): CalculatedStats {
    return {
      hp: stats.baseHp + stats.spHp + StatCalculator.HP_STAT_OFFSET,
      attack: this.calculateStat(stats.baseAttack, stats.spAttack, stats.nature, 'attack'),
      defense: this.calculateStat(stats.baseDefense, stats.spDefense, stats.nature, 'defense'),
      specialAttack: this.calculateStat(
        stats.baseSpecialAttack,
        stats.spSpecialAttack,
        stats.nature,
        'specialAttack',
      ),
      specialDefense: this.calculateStat(
        stats.baseSpecialDefense,
        stats.spSpecialDefense,
        stats.nature,
        'specialDefense',
      ),
      speed: this.calculateStat(stats.baseSpeed, stats.spSpeed, stats.nature, 'speed'),
    };
  }

  /**
   * HP以外のステータスを計算
   * floor((種族値 + 能力ポイント + 20) * 能力補正)
   */
  private static calculateStat(
    base: number,
    statPoints: number,
    nature: Nature | null,
    statType: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' | 'speed',
  ): number {
    const baseValue = base + statPoints + StatCalculator.NON_HP_STAT_OFFSET;
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
      return StatCalculator.NATURE_NEUTRAL_MULTIPLIER;
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
      return StatCalculator.NATURE_UP_MULTIPLIER;
    }
    if (modifier.down === statType && modifier.up !== statType) {
      return StatCalculator.NATURE_DOWN_MULTIPLIER;
    }
    return StatCalculator.NATURE_NEUTRAL_MULTIPLIER;
  }
}
