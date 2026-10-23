import {
  CHAMPIONS_LEARNSET_METHOD,
  ChampionsLearnsetDb,
  ChampionsLearnsets,
  applyChampionsLearnsets,
  loadChampionsLearnsets,
  normalizeMoveName,
  parseSerebiiChampionsPage,
  parseSerebiiChampionsSlugs,
  planChampionsLearnsets,
  summarizeMoveCounts,
} from '../../../prisma/seed-utils/champions-learnsets';
import { REGULATION_M_C } from '../../modules/battle/domain/regulations/regulation-m-c';

/**
 * Serebii の技の表の 1 行（技名のセル、タイプなどのセル、説明の行）
 */
const moveRow = (slug: string, name: string): string => `<tr>
				<td rowspan="2" class="fooinfo"><a href="/attackdex-champions/${slug}.shtml">${name}</a></td>
				<td class="cen"><img src="/pokedex-bw/type/fire.gif" alt="${name} - Fire-type"></td>
				<td class="cen">90</td></tr>
				<tr><td class="fooinfo" colspan="6">Description.</td></tr>`;

/**
 * Serebii の技の表（見出しと、技の行）
 */
const moveTable = (anchor: string, title: string, rows: string[]): string =>
  `<a name="attacks"></a><table class="dextable"><tr ><td colspan="10" class="fooevo"><h3><a name="${anchor}"></a>${title}</h3></td></tr>` +
  `<tr><th class="attheader">Attack Name</th><th class="attheader">Type</th></tr>${rows.join('')}</table>`;

const page = (title: string, tables: string[]): string => `<!DOCTYPE html>
<html><head><title>${title}</title></head><body>
<table><tr><td><a href="/attackdex-champions/notamove.shtml">Not In Attacks</a></td></tr></table>
${tables.join('<br />')}
<br /><a name="stats"></a><table class="dextable"><tr><td><h3>Mega Absol</h3></td></tr></table>
</body></html>`;

describe('champions-learnsets', () => {
  describe('parseSerebiiChampionsPage', () => {
    it('ページの題から全国図鑑の番号と英語名を読み、Standard Moves の表の技名を読む', () => {
      // Arrange
      const html = page('Incineroar - #727 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves', [
          moveRow('flareblitz', 'Flare Blitz'),
          moveRow('will-o-wisp', 'Will-O-Wisp'),
        ]),
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result).toEqual({
        nationalDex: 727,
        name: 'Incineroar',
        moves: ['Flare Blitz', 'Will-O-Wisp'],
        otherFormTables: [],
      });
    });

    it('別のすがたの表（Hisuian Form Standard Moves など）は技に入れず、表の名前だけを返す', () => {
      // Arrange
      const html = page('Arcanine - #059 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves', [moveRow('flareblitz', 'Flare Blitz')]),
        moveTable('hisuianlevel', 'Hisuian Form Standard Moves', [
          moveRow('headsmash', 'Head Smash'),
        ]),
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.nationalDex).toBe(59);
      expect(result.moves).toEqual(['Flare Blitz']);
      expect(result.otherFormTables).toEqual(['Hisuian Form Standard Moves']);
    });

    it('アンカーのない表（Standard Moves - Midnight Form など）も、別のすがたの表として読む', () => {
      // Arrange
      const html = page('Lycanroc - #745 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves', [moveRow('accelerock', 'Accelerock')]),
        `<table class="dextable"><tr ><td colspan="10" class="fooevo"><h3>Standard Moves - Midnight Form</h3></td></tr>${moveRow('counter', 'Counter')}</table>`,
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.moves).toEqual(['Accelerock']);
      expect(result.otherFormTables).toEqual(['Standard Moves - Midnight Form']);
    });

    it('すがたごとの表しかないページ（オス・メスなど）は、最初の表を既定のすがたとして読む', () => {
      // Arrange
      const html = page('Meowstic - #678 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves - Male', [moveRow('yawn', 'Yawn')]),
        `<table class="dextable"><tr ><td colspan="10" class="fooevo"><h3>Standard Moves - Female</h3></td></tr>${moveRow('charm', 'Charm')}</table>`,
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.moves).toEqual(['Yawn']);
      expect(result.otherFormTables).toEqual(['Standard Moves - Female']);
    });

    it('見出しの前に空白がある表（ Standard Moves - Eternal Floette）も読む', () => {
      // Arrange
      const html = page('Floette - #670 - Serebii.net Pok&eacute;dex', [
        `<a name="attacks"></a><table class="dextable"><tr ><td colspan="10" class="fooevo"><h3> Standard Moves - Eternal Floette</h3></td></tr>${moveRow('lightofruin', 'Light of Ruin')}</table>`,
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.moves).toEqual(['Light of Ruin']);
      expect(result.otherFormTables).toEqual([]);
    });

    it('技名の HTML の文字参照（&#039; など）を元の文字に戻す', () => {
      // Arrange
      const html = page('Aegislash - #681 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves', [
          moveRow('kingsshield', 'King&#039;s Shield'),
          moveRow('kingsshield2', 'King&#x2019;s Shield'),
        ]),
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.moves).toEqual(["King's Shield", 'King’s Shield']);
    });

    it('同じ技が 2 回あっても 1 回にする', () => {
      // Arrange
      const html = page('Absol - #359 - Serebii.net Pok&eacute;dex', [
        moveTable('standardlevel', 'Standard Moves', [
          moveRow('slash', 'Slash'),
          moveRow('slash', 'Slash'),
        ]),
      ]);

      // Act
      const result = parseSerebiiChampionsPage(html);

      // Assert
      expect(result.moves).toEqual(['Slash']);
    });

    it('Standard Moves の表がないページはエラーにする', () => {
      // Arrange
      const html = page('Absol - #359 - Serebii.net Pok&eacute;dex', []);

      // Act & Assert
      expect(() => parseSerebiiChampionsPage(html)).toThrow('Standard Moves');
    });

    it('題に全国図鑑の番号がないページはエラーにする', () => {
      // Arrange
      const html = page('Serebii.net', [
        moveTable('standardlevel', 'Standard Moves', [moveRow('slash', 'Slash')]),
      ]);

      // Act & Assert
      expect(() => parseSerebiiChampionsPage(html)).toThrow('全国図鑑');
    });
  });

  describe('parseSerebiiChampionsSlugs', () => {
    it('一覧のページから、ポケモンごとのページの名前を重ねずに読む', () => {
      // Arrange
      const html = `<a href="/pokedex-champions/">Pokédex</a>
        <a href="/pokedex-champions/incineroar/"><img /></a>
        <a href="/pokedex-champions/incineroar/">Incineroar</a>
        <a href="/pokedex-champions/mr.rime/">Mr. Rime</a>
        <a href="/pokedex-champions/abomasnow/">Abomasnow</a>`;

      // Act
      const slugs = parseSerebiiChampionsSlugs(html);

      // Assert
      expect(slugs).toEqual(['abomasnow', 'incineroar', 'mr.rime']);
    });
  });

  describe('normalizeMoveName', () => {
    it.each([
      ['Will-O-Wisp', 'willowisp'],
      ['U-turn', 'uturn'],
      ["King's Shield", 'kingsshield'],
      ['King’s Shield', 'kingsshield'],
      ['  Flare  Blitz ', 'flareblitz'],
      ['Double-Edge', 'doubleedge'],
      ['Pokémon', 'pokemon'],
    ])('%s は %s になる', (name, expected) => {
      expect(normalizeMoveName(name)).toBe(expected);
    });
  });

  describe('planChampionsLearnsets', () => {
    const moves = [
      { id: 1, nameEn: 'Flare Blitz' },
      { id: 2, nameEn: 'Will-O-Wisp' },
      { id: 3, nameEn: "King's Shield" },
    ];

    it('英語名の書き方の違いを無視して技の ID に変え、ポケモンの ID と合わせる', () => {
      // Arrange
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Flare Blitz', 'Will-o-Wisp'] },
        681: { name: 'Aegislash', moves: ['King’s Shield'] },
      };
      const pokemonIdByDex = new Map([
        [727, 70],
        [681, 60],
      ]);

      // Act
      const plan = planChampionsLearnsets(learnsets, pokemonIdByDex, moves);

      // Assert
      expect(plan.updates).toEqual([
        { nationalDex: 681, pokemonId: 60, moveIds: [3] },
        { nationalDex: 727, pokemonId: 70, moveIds: [1, 2] },
      ]);
      expect(plan.unmatchedMoves).toEqual([]);
      expect(plan.missingPokemon).toEqual([]);
    });

    it('DB にない技の名前は unmatchedMoves に出し、ほかの技は入れる', () => {
      // Arrange
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Flare Blitz', 'Unknown Move'] },
      };

      // Act
      const plan = planChampionsLearnsets(learnsets, new Map([[727, 70]]), moves);

      // Assert
      expect(plan.updates).toEqual([{ nationalDex: 727, pokemonId: 70, moveIds: [1] }]);
      expect(plan.unmatchedMoves).toEqual([{ nationalDex: 727, name: 'Unknown Move' }]);
    });

    it('DB にないポケモンは missingPokemon に出し、更新しない', () => {
      // Arrange
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Flare Blitz'] },
      };

      // Act
      const plan = planChampionsLearnsets(learnsets, new Map(), moves);

      // Assert
      expect(plan.updates).toEqual([]);
      expect(plan.missingPokemon).toEqual([727]);
    });

    it('同じ技に当たる名前が 2 つあっても、技の ID は 1 つにする', () => {
      // Arrange
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Will-O-Wisp', 'Will-o-Wisp'] },
      };

      // Act
      const plan = planChampionsLearnsets(learnsets, new Map([[727, 70]]), moves);

      // Assert
      expect(plan.updates[0].moveIds).toEqual([2]);
    });
  });

  describe('summarizeMoveCounts', () => {
    it('技の数の最小・平均・最大を返す', () => {
      expect(summarizeMoveCounts([10, 20, 33])).toEqual({ min: 10, avg: 21, max: 33 });
    });

    it('空のときは 0 を返す', () => {
      expect(summarizeMoveCounts([])).toEqual({ min: 0, avg: 0, max: 0 });
    });
  });

  describe('applyChampionsLearnsets', () => {
    /**
     * pokemon_moves を配列で持つ、DB の代わり
     */
    const createFakeDb = (
      initialRows: { pokemonId: number; moveId: number; level: number | null; method: string }[],
    ): ChampionsLearnsetDb & { rows: typeof initialRows } => {
      const db = {
        rows: [...initialRows],
        pokemon: {
          findMany: () =>
            Promise.resolve([
              { id: 70, nationalDex: 727 },
              { id: 80, nationalDex: 1 },
            ]),
        },
        move: {
          findMany: () =>
            Promise.resolve([
              { id: 1, nameEn: 'Flare Blitz' },
              { id: 2, nameEn: 'Will-O-Wisp' },
            ]),
        },
        pokemonMove: {
          deleteMany: ({ where }: { where: { pokemonId: number } }) => {
            db.rows = db.rows.filter(row => row.pokemonId !== where.pokemonId);
            return Promise.resolve({ count: 0 });
          },
          createMany: ({ data }: { data: typeof initialRows }) => {
            db.rows.push(...data);
            return Promise.resolve({ count: data.length });
          },
        },
        $transaction: (operations: Promise<unknown>[]) => Promise.all(operations),
      };
      return db as unknown as ChampionsLearnsetDb & { rows: typeof initialRows };
    };

    it('表にあるポケモンの技を、チャンピオンズの技だけに入れ替える。表にないポケモンの技は残す', async () => {
      // Arrange
      const db = createFakeDb([
        { pokemonId: 70, moveId: 9, level: 1, method: 'level-up' },
        { pokemonId: 80, moveId: 9, level: 1, method: 'level-up' },
      ]);
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Flare Blitz', 'Will-O-Wisp'] },
      };

      // Act
      const result = await applyChampionsLearnsets(db, learnsets);

      // Assert
      expect(db.rows).toEqual([
        { pokemonId: 80, moveId: 9, level: 1, method: 'level-up' },
        { pokemonId: 70, moveId: 1, level: 0, method: CHAMPIONS_LEARNSET_METHOD },
        { pokemonId: 70, moveId: 2, level: 0, method: CHAMPIONS_LEARNSET_METHOD },
      ]);
      expect(result.updates).toHaveLength(1);
    });

    it('2 回当てても行は増えない', async () => {
      // Arrange
      const db = createFakeDb([]);
      const learnsets: ChampionsLearnsets = {
        727: { name: 'Incineroar', moves: ['Flare Blitz'] },
      };

      // Act
      await applyChampionsLearnsets(db, learnsets);
      await applyChampionsLearnsets(db, learnsets);

      // Assert
      expect(db.rows).toEqual([
        { pokemonId: 70, moveId: 1, level: 0, method: CHAMPIONS_LEARNSET_METHOD },
      ]);
    });
  });

  describe('champions-learnsets.data.json', () => {
    let learnsets: ChampionsLearnsets;

    beforeAll(() => {
      learnsets = loadChampionsLearnsets();
    });

    it('レギュレーション M-C で使えるポケモン（231 種類）がそろっている', () => {
      const dexes = Object.keys(learnsets)
        .map(Number)
        .sort((a, b) => a - b);
      expect(dexes).toEqual([...REGULATION_M_C.allowedNationalDex].sort((a, b) => a - b));
    });

    it('どのポケモンにも 1 つ以上の技がある', () => {
      const empty = Object.entries(learnsets).filter(([, entry]) => entry.moves.length === 0);
      expect(empty).toEqual([]);
    });

    it('ガオガエンは フレアドライブ を覚え、はたきおとす と とんぼがえり を覚えない（#259 の調べ）', () => {
      const moves = learnsets[727].moves;
      expect(moves).toContain('Flare Blitz');
      expect(moves).not.toContain('Knock Off');
      expect(moves).not.toContain('U-turn');
    });

    it('ブリジュラスは ボディプレス を覚えない（#259 の調べ）', () => {
      expect(learnsets[1018].moves).not.toContain('Body Press');
    });
  });
});
