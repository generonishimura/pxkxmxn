import * as fs from 'fs';
import * as path from 'path';

/**
 * チャンピオンズで覚えられる技（ポケモンごとの技の一覧）
 *
 * PokeAPI の pokemon_moves は SV（スカーレット・バイオレット）の覚える技。チャンピオンズで使えるポケモンは、
 * seed のあとに pokemon_moves をチャンピオンズの技だけに入れ替える。表にないポケモンは SV の技のまま残す。
 * すでに seed した DB には、`npm run apply:champions-learnsets` で入れ替えだけを当てられる。
 *
 * データ: champions-learnsets.data.json（全国図鑑の番号ごとに、英語名と技の英語名の一覧）。
 * 出典は Serebii の Champions 図鑑のポケモンごとのページ（https://www.serebii.net/pokedex-champions/<名前>/）の
 * 「Standard Moves」の表。`npm run build:champions-learnsets` で作り直せる。
 *
 * フォルム: DB の pokemons は全国図鑑の番号ごとに 1 行（既定のすがた）なので、既定のすがたの表
 * （Standard Moves）だけを使う。リージョンフォームなどの表（Hisuian Form Standard Moves など）は使わない。
 */

/** チャンピオンズの技として入れる行の method（PokeAPI の level-up・machine などと分けるため） */
export const CHAMPIONS_LEARNSET_METHOD = 'champions';

/** チャンピオンズの技として入れる行の level（チャンピオンズにはレベルで覚える区別がない） */
export const CHAMPIONS_LEARNSET_LEVEL = 0;

/** champions-learnsets.data.json の 1 ポケモン分 */
export interface ChampionsLearnsetEntry {
  /** Serebii の英語名（読みやすさのため。突き合わせには使わない） */
  readonly name: string;
  /** 技の英語名（Serebii の表記） */
  readonly moves: readonly string[];
}

/** 全国図鑑の番号 → 覚えられる技 */
export type ChampionsLearnsets = Readonly<Record<number, ChampionsLearnsetEntry>>;

interface ChampionsLearnsetsFile {
  readonly source: string;
  readonly retrievedAt: string;
  readonly learnsets: Record<string, ChampionsLearnsetEntry>;
}

export const CHAMPIONS_LEARNSETS_PATH = path.join(__dirname, 'champions-learnsets.data.json');

/**
 * champions-learnsets.data.json を読む
 */
export const loadChampionsLearnsets = (filePath = CHAMPIONS_LEARNSETS_PATH): ChampionsLearnsets => {
  const file = JSON.parse(fs.readFileSync(filePath, 'utf8')) as ChampionsLearnsetsFile;
  return file.learnsets;
};

/**
 * champions-learnsets.data.json に書く中身を作る（番号の小さい順）
 */
export const serializeChampionsLearnsets = (
  learnsets: ChampionsLearnsets,
  source: string,
  retrievedAt: string,
): string => {
  const sorted: Record<string, ChampionsLearnsetEntry> = {};
  for (const dex of Object.keys(learnsets)
    .map(Number)
    .sort((a, b) => a - b)) {
    sorted[String(dex)] = learnsets[dex];
  }
  const file: ChampionsLearnsetsFile = { source, retrievedAt, learnsets: sorted };
  return `${JSON.stringify(file, null, 2)}\n`;
};

// ---------------------------------------------------------------------------
// Serebii のページを読む
// ---------------------------------------------------------------------------

const NAMED_ENTITIES: Readonly<Record<string, string>> = {
  amp: '&',
  quot: '"',
  apos: "'",
  lt: '<',
  gt: '>',
  nbsp: ' ',
  eacute: 'é',
};

/**
 * HTML の文字参照（&#039; &#x2019; &eacute; など）を元の文字に戻す
 */
const decodeHtmlEntities = (text: string): string =>
  text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#x') || entity.startsWith('#X')) {
      return String.fromCodePoint(parseInt(entity.slice(2), 16));
    }
    if (entity.startsWith('#')) {
      return String.fromCodePoint(parseInt(entity.slice(1), 10));
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

/** Serebii の Champions 図鑑の 1 ページから読んだ内容 */
export interface SerebiiChampionsPage {
  readonly nationalDex: number;
  readonly name: string;
  /** 既定のすがたの技（Standard Moves の表） */
  readonly moves: string[];
  /** 使わなかった、別のすがたの技の表の名前（Hisuian Form Standard Moves など） */
  readonly otherFormTables: string[];
}

/**
 * 技の表 1 つ分（見出しが「Standard Moves」を含む h3 から、その表の </table> まで）
 * 見出しは「Standard Moves」「Hisuian Form Standard Moves」「Standard Moves - Male」
 * 「 Standard Moves - Eternal Floette」などがある。h3 の前にアンカー（<a name="standardlevel"></a>）がないこともある
 */
const MOVE_TABLE_PATTERN =
  /<h3>(?:<a name="[^"]*"><\/a>)?([^<]*Standard Moves[^<]*)<\/h3>([\s\S]*?)<\/table>/g;
const MOVE_LINK_PATTERN = /<a href="\/attackdex-champions\/[^"]+\.shtml">([^<]+)<\/a>/g;
const PAGE_TITLE_PATTERN = /<title>\s*([^<]*?)\s+-\s+#(\d+)\s+-/;

/**
 * Serebii の Champions 図鑑のポケモンのページ（pokedex-champions/<名前>/）から、覚えられる技を読む
 * 技は、ページの最初の技の表（既定のすがた）から読む。Serebii は既定のすがたの表を最初に置く
 * （「Standard Moves」、すがたごとの表しかないときは「Standard Moves - Male」「Standard Moves - Eternal Floette」など）。
 * 2 つ目からの表（リージョンフォーム・メス・ほかのフォルム）は、otherFormTables に名前だけを返す
 */
export const parseSerebiiChampionsPage = (html: string): SerebiiChampionsPage => {
  const titleMatch = PAGE_TITLE_PATTERN.exec(html);
  if (!titleMatch) {
    throw new Error('ページの題に全国図鑑の番号がありません');
  }
  const name = decodeHtmlEntities(titleMatch[1]);
  const nationalDex = parseInt(titleMatch[2], 10);

  let moves: string[] | null = null;
  const otherFormTables: string[] = [];
  for (const tableMatch of html.matchAll(MOVE_TABLE_PATTERN)) {
    const title = decodeHtmlEntities(tableMatch[1]).trim();
    const body = tableMatch[2];
    if (moves !== null) {
      otherFormTables.push(title);
      continue;
    }
    const names = [...body.matchAll(MOVE_LINK_PATTERN)].map(match =>
      decodeHtmlEntities(match[1]).trim(),
    );
    moves = [...new Set(names)];
  }
  if (moves === null) {
    throw new Error(`${name}（#${nationalDex}）のページに Standard Moves の表がありません`);
  }
  return { nationalDex, name, moves, otherFormTables };
};

/**
 * Serebii の Champions の使えるポケモンの一覧（pokemonchampions/pokemon.shtml）から、
 * ポケモンごとのページの名前（pokedex-champions/<名前>/ の <名前>）を読む
 */
export const parseSerebiiChampionsSlugs = (html: string): string[] => {
  const slugs = [...html.matchAll(/href="\/pokedex-champions\/([^"/]+)\/"/g)].map(m => m[1]);
  return [...new Set(slugs)].sort();
};

// ---------------------------------------------------------------------------
// DB の技・ポケモンと突き合わせる
// ---------------------------------------------------------------------------

/**
 * 技の英語名を突き合わせ用の形にする
 * 大文字・小文字、ハイフン・空白・アポストロフィ、アクセント記号の違いを無視する
 * 例: 'Will-O-Wisp' と 'Will-o-Wisp' → 'willowisp'、"King's Shield" → 'kingsshield'
 */
export const normalizeMoveName = (name: string): string =>
  name
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

/** 1 ポケモン分の入れ替え */
export interface ChampionsLearnsetUpdate {
  readonly nationalDex: number;
  readonly pokemonId: number;
  readonly moveIds: number[];
}

export interface ChampionsLearnsetPlan {
  readonly updates: ChampionsLearnsetUpdate[];
  /** DB の技に当たらなかった技の名前 */
  readonly unmatchedMoves: { nationalDex: number; name: string }[];
  /** DB にないポケモン（全国図鑑の番号） */
  readonly missingPokemon: number[];
}

/**
 * 表の技の英語名を DB の技の ID に変え、ポケモンごとの入れ替えを決める（番号の小さい順）
 */
export const planChampionsLearnsets = (
  learnsets: ChampionsLearnsets,
  pokemonIdByDex: ReadonlyMap<number, number>,
  moves: readonly { id: number; nameEn: string }[],
): ChampionsLearnsetPlan => {
  const moveIdByName = new Map(moves.map(move => [normalizeMoveName(move.nameEn), move.id]));
  const updates: ChampionsLearnsetUpdate[] = [];
  const unmatchedMoves: { nationalDex: number; name: string }[] = [];
  const missingPokemon: number[] = [];

  const dexes = Object.keys(learnsets)
    .map(Number)
    .sort((a, b) => a - b);
  for (const nationalDex of dexes) {
    const pokemonId = pokemonIdByDex.get(nationalDex);
    if (pokemonId === undefined) {
      missingPokemon.push(nationalDex);
      continue;
    }
    const moveIds = new Set<number>();
    for (const name of learnsets[nationalDex].moves) {
      const moveId = moveIdByName.get(normalizeMoveName(name));
      if (moveId === undefined) {
        unmatchedMoves.push({ nationalDex, name });
        continue;
      }
      moveIds.add(moveId);
    }
    updates.push({ nationalDex, pokemonId, moveIds: [...moveIds] });
  }
  return { updates, unmatchedMoves, missingPokemon };
};

/**
 * 技の数の最小・平均（小数点以下は四捨五入）・最大
 */
export const summarizeMoveCounts = (
  counts: readonly number[],
): { min: number; avg: number; max: number } => {
  if (counts.length === 0) {
    return { min: 0, avg: 0, max: 0 };
  }
  const total = counts.reduce((sum, count) => sum + count, 0);
  return {
    min: Math.min(...counts),
    avg: Math.round(total / counts.length),
    max: Math.max(...counts),
  };
};

// ---------------------------------------------------------------------------
// DB に当てる
// ---------------------------------------------------------------------------

interface PokemonMoveRow {
  pokemonId: number;
  moveId: number;
  level: number;
  method: string;
}

/**
 * 入れ替えに使う DB の操作（PrismaClient のうち、使うところだけ）
 */
export interface ChampionsLearnsetDb {
  pokemon: {
    findMany(args: {
      select: { id: true; nationalDex: true };
    }): Promise<{ id: number; nationalDex: number }[]>;
  };
  move: {
    findMany(args: {
      select: { id: true; nameEn: true };
    }): Promise<{ id: number; nameEn: string }[]>;
  };
  pokemonMove: {
    deleteMany(args: { where: { pokemonId: number } }): PromiseLike<unknown>;
    createMany(args: { data: PokemonMoveRow[] }): PromiseLike<unknown>;
  };
  $transaction(operations: PromiseLike<unknown>[]): Promise<unknown>;
}

/**
 * 表にあるポケモンの pokemon_moves を、チャンピオンズの技だけに入れ替える
 * ポケモンごとに、消す・入れるを 1 つのトランザクションで行う。何度当てても結果は同じ
 */
export const applyChampionsLearnsets = async (
  db: ChampionsLearnsetDb,
  learnsets: ChampionsLearnsets = loadChampionsLearnsets(),
): Promise<ChampionsLearnsetPlan> => {
  const pokemons = await db.pokemon.findMany({ select: { id: true, nationalDex: true } });
  const moves = await db.move.findMany({ select: { id: true, nameEn: true } });
  const plan = planChampionsLearnsets(
    learnsets,
    new Map(pokemons.map(pokemon => [pokemon.nationalDex, pokemon.id])),
    moves,
  );

  for (const update of plan.updates) {
    await db.$transaction([
      db.pokemonMove.deleteMany({ where: { pokemonId: update.pokemonId } }),
      db.pokemonMove.createMany({
        data: update.moveIds.map(moveId => ({
          pokemonId: update.pokemonId,
          moveId,
          level: CHAMPIONS_LEARNSET_LEVEL,
          method: CHAMPIONS_LEARNSET_METHOD,
        })),
      }),
    ]);
  }
  return plan;
};
