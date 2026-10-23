import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import {
  MEGA_EVOLUTIONS,
  findMegaEvolution,
  findMegaEvolutionByStone,
  isMegaStone,
} from './mega-evolutions';
import { defaultPokemonForm, resolvePokemonForm } from './pokemon-forms';

/**
 * まだ AbilityRegistry に登録していない、メガシンカの特性
 * 登録したら、ここから消す（消し忘れると「登録していない特性だけを書く」のテストが落ちる）
 */
const NOT_YET_IMPLEMENTED_ABILITIES: readonly string[] = [
  'ドラゴンスキン',
  'かんつうドリル',
  'Eelevate',
  'Fire Mane',
  'Aura Guard',
  'とびだすハバネロ',
];

const TYPE_NAMES = [
  'ノーマル',
  'ほのお',
  'みず',
  'でんき',
  'くさ',
  'こおり',
  'かくとう',
  'どく',
  'じめん',
  'ひこう',
  'エスパー',
  'むし',
  'いわ',
  'ゴースト',
  'ドラゴン',
  'あく',
  'はがね',
  'フェアリー',
];

const total = (stats: (typeof MEGA_EVOLUTIONS)[number]['baseStats']): number =>
  stats.hp +
  stats.attack +
  stats.defense +
  stats.specialAttack +
  stats.specialDefense +
  stats.speed;

describe('findMegaEvolution', () => {
  it('種族とメガストーンが合えば、メガシンカした姿を返す', () => {
    // Act
    const mega = findMegaEvolution(94, 'ゲンガナイト');

    // Assert
    expect(mega).toEqual({
      nationalDex: 94,
      speciesName: 'ゲンガー',
      form: 'mega',
      stoneName: 'ゲンガナイト',
      types: ['ゴースト', 'どく'],
      baseStats: {
        hp: 60,
        attack: 65,
        defense: 80,
        specialAttack: 170,
        specialDefense: 95,
        speed: 130,
      },
      abilityName: 'かげふみ',
    });
  });

  it('2 つの姿があるポケモンは、メガストーンで姿が決まる（リザードン X・Y）', () => {
    // Act
    const x = findMegaEvolution(6, 'リザードナイトＸ');
    const y = findMegaEvolution(6, 'リザードナイトＹ');

    // Assert
    expect(x?.form).toBe('mega-x');
    expect(x?.types).toEqual(['ほのお', 'ドラゴン']);
    expect(x?.abilityName).toBe('かたいツメ');
    expect(y?.form).toBe('mega-y');
    expect(y?.types).toEqual(['ほのお', 'ひこう']);
    expect(y?.abilityName).toBe('ひでり');
  });

  it('Z のメガストーンは、Z の姿になる（アブソル）', () => {
    // Act
    const normal = findMegaEvolution(359, 'アブソルナイト');
    const z = findMegaEvolution(359, 'アブソルナイトZ');

    // Assert
    expect(normal?.form).toBe('mega');
    expect(z?.form).toBe('mega-z');
    expect(z?.types).toEqual(['あく', 'ゴースト']);
  });

  it('別の種族のメガストーンでは、メガシンカしない', () => {
    // Act & Assert
    expect(findMegaEvolution(6, 'ゲンガナイト')).toBeUndefined();
  });

  it('メガストーンでない持ち物・持ち物なしでは、メガシンカしない', () => {
    // Act & Assert
    expect(findMegaEvolution(94, 'たべのこし')).toBeUndefined();
    expect(findMegaEvolution(94, undefined)).toBeUndefined();
    expect(findMegaEvolution(94, null)).toBeUndefined();
  });

  it('ニャオニクスは、オスもメスも 1 つのメガストーンで同じ姿になる', () => {
    // Act
    const mega = findMegaEvolution(678, 'ニャオニクスナイト');

    // Assert
    expect(mega?.form).toBe('mega');
    expect(MEGA_EVOLUTIONS.filter(entry => entry.nationalDex === 678)).toHaveLength(1);
  });
});

describe('findMegaEvolutionByStone / isMegaStone', () => {
  it('メガストーンから、メガシンカする種族と姿を引ける', () => {
    // Act
    const mega = findMegaEvolutionByStone('ガブリアスナイトZ');

    // Assert
    expect(mega?.nationalDex).toBe(445);
    expect(mega?.form).toBe('mega-z');
  });

  it('メガストーンかを判定する', () => {
    // Act & Assert
    expect(isMegaStone('ルカリオナイト')).toBe(true);
    expect(isMegaStone('もくたん')).toBe(false);
    expect(isMegaStone(undefined)).toBe(false);
  });
});

describe('MEGA_EVOLUTIONS の表', () => {
  it('チャンピオンズのメガストーン 81 個ぶんの姿がある', () => {
    // Assert
    expect(MEGA_EVOLUTIONS).toHaveLength(81);
  });

  it('メガストーンは、それぞれ 1 つの姿にだけ対応する', () => {
    // Arrange
    const stones = MEGA_EVOLUTIONS.map(entry => entry.stoneName);

    // Assert
    expect(new Set(stones).size).toBe(stones.length);
  });

  it('種族と姿の組み合わせは重ならない', () => {
    // Arrange
    const keys = MEGA_EVOLUTIONS.map(entry => `${entry.nationalDex}:${entry.form}`);

    // Assert
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('姿の名前は mega・mega-x・mega-y・mega-z のどれか', () => {
    // Assert
    for (const entry of MEGA_EVOLUTIONS) {
      expect(entry.form).toMatch(/^mega(-[xyz])?$/);
    }
  });

  it('タイプは 1 つか 2 つで、どれも DB のタイプ名', () => {
    // Assert
    for (const entry of MEGA_EVOLUTIONS) {
      expect(entry.types.length).toBeGreaterThanOrEqual(1);
      expect(entry.types.length).toBeLessThanOrEqual(2);
      for (const type of entry.types) {
        expect(TYPE_NAMES).toContain(type);
      }
    }
  });

  it('種族値は正の整数で、合計は 480 から 780 のあいだ', () => {
    // Assert
    for (const entry of MEGA_EVOLUTIONS) {
      for (const value of Object.values(entry.baseStats)) {
        expect(Number.isInteger(value) && value > 0).toBe(true);
      }
      const sum = total(entry.baseStats);
      expect(sum).toBeGreaterThanOrEqual(480);
      expect(sum).toBeLessThanOrEqual(780);
    }
  });

  it('同じ種族の別の姿（X・Y・Z）は、HP と種族値の合計が同じ', () => {
    // Arrange
    const byDex = new Map<number, (typeof MEGA_EVOLUTIONS)[number][]>();
    for (const entry of MEGA_EVOLUTIONS) {
      byDex.set(entry.nationalDex, [...(byDex.get(entry.nationalDex) ?? []), entry]);
    }

    // Assert
    for (const entries of byDex.values()) {
      const [first, ...rest] = entries;
      for (const entry of rest) {
        expect(entry.baseStats.hp).toBe(first.baseStats.hp);
        expect(total(entry.baseStats)).toBe(total(first.baseStats));
      }
    }
  });

  describe('特性', () => {
    beforeEach(() => {
      AbilityRegistry.clear();
      AbilityRegistry.initialize();
    });

    it('どの特性も、AbilityRegistry に登録しているか、まだ登録していない特性の一覧にある', () => {
      // Act
      const missing = MEGA_EVOLUTIONS.map(entry => entry.abilityName).filter(
        name =>
          AbilityRegistry.get(name) === undefined && !NOT_YET_IMPLEMENTED_ABILITIES.includes(name),
      );

      // Assert
      expect(missing).toEqual([]);
    });

    it('まだ登録していない特性の一覧には、登録していない特性だけを書く', () => {
      // Act
      const registered = NOT_YET_IMPLEMENTED_ABILITIES.filter(
        name => AbilityRegistry.get(name) !== undefined,
      );

      // Assert
      expect(registered).toEqual([]);
    });
  });

  it.each([
    // issue #262 の表（Game8 の値）と、PokeAPI から作った表の値が合う
    ['ライチュウナイトＸ', ['でんき'], [60, 135, 95, 90, 95, 110], 'エレキメイカー'],
    ['ライチュウナイトＹ', ['でんき'], [60, 100, 55, 160, 80, 130], 'ノーガード'],
    ['ムクホークナイト', ['かくとう', 'ひこう'], [85, 140, 100, 60, 90, 110], 'あまのじゃく'],
    ['ペンドラナイト', ['むし', 'どく'], [60, 140, 149, 75, 99, 62], 'シェルアーマー'],
    ['ズルズキナイト', ['あく', 'かくとう'], [65, 130, 135, 55, 135, 68], 'いかく'],
    ['シビルドナイト', ['でんき'], [85, 145, 80, 135, 90, 80], 'Eelevate'],
    ['カエンジシナイト', ['ほのお', 'ノーマル'], [86, 88, 92, 129, 86, 126], 'Fire Mane'],
    ['カラマネナイト', ['あく', 'エスパー'], [86, 102, 88, 98, 120, 88], 'あまのじゃく'],
    ['ガメノデスナイト', ['いわ', 'かくとう'], [72, 140, 130, 64, 106, 88], 'かたいツメ'],
    ['ドラミドナイト', ['どく', 'ドラゴン'], [65, 85, 105, 132, 163, 44], 'さいせいりょく'],
    ['タイレーツナイト', ['かくとう'], [65, 135, 135, 70, 65, 100], 'まけんき'],
    ['アブソルナイトZ', ['あく', 'ゴースト'], [65, 154, 60, 75, 60, 151], 'きれあじ'],
    ['ガブリアスナイトZ', ['ドラゴン'], [108, 130, 85, 141, 85, 151], 'ふゆう'],
    ['ルカリオナイトZ', ['かくとう', 'はがね'], [70, 100, 70, 164, 70, 151], 'Aura Guard'],
    ['グソクムシャナイト', ['むし', 'はがね'], [75, 150, 175, 70, 120, 40], 'かたいツメ'],
    ['セグレイブナイト', ['ドラゴン', 'こおり'], [115, 175, 117, 105, 101, 87], 'ねつこうかん'],
  ] as const)('%s の姿は issue #262 の値と合う', (stone, types, stats, ability) => {
    // Act
    const mega = findMegaEvolutionByStone(stone);

    // Assert
    expect(mega?.types).toEqual(types);
    expect(mega && Object.values(mega.baseStats)).toEqual(stats);
    expect(mega?.abilityName).toBe(ability);
  });
});

describe('POKEMON_FORMS とのつながり', () => {
  it('メガシンカした姿は、フォルムの表から引ける（交代しても残るフォルムとして特性も持つ）', () => {
    // Act
    const form = resolvePokemonForm(6, 'mega-x');

    // Assert
    expect(form).toEqual({
      nationalDex: 6,
      form: 'mega-x',
      types: ['ほのお', 'ドラゴン'],
      baseStats: {
        hp: 78,
        attack: 130,
        defense: 111,
        specialAttack: 130,
        specialDefense: 85,
        speed: 100,
      },
      abilityName: 'かたいツメ',
    });
  });

  it('メガシンカした姿は既定のフォルムにならない（フォルムを書いていなければ DB の値を使う）', () => {
    // Act & Assert
    expect(defaultPokemonForm(6)).toBeUndefined();
  });
});
