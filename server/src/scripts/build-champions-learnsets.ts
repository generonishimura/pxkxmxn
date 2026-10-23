/**
 * Serebii の Champions 図鑑から、チャンピオンズで覚えられる技を読み、
 * prisma/seed-utils/champions-learnsets.data.json を作り直す
 *
 * 1. 使えるポケモンの一覧（https://www.serebii.net/pokemonchampions/pokemon.shtml）からページの名前を読む
 * 2. ポケモンごとのページ（https://www.serebii.net/pokedex-champions/<名前>/）を 1 ページずつ、間を空けて取る
 * 3. 各ページの Standard Moves の表の技名を JSON に書く
 *
 * 取ったページは、引数のフォルダに保存する。保存してあるページは取り直さない（Serebii に何度も取りに行かないため）。
 * フォルダはリポジトリの外に置く。
 *
 * 使い方: npm run build:champions-learnsets -- <ページを保存するフォルダ>
 */

import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';
import {
  CHAMPIONS_LEARNSETS_PATH,
  ChampionsLearnsetEntry,
  parseSerebiiChampionsPage,
  parseSerebiiChampionsSlugs,
  serializeChampionsLearnsets,
} from '../../prisma/seed-utils/champions-learnsets';

const LIST_URL = 'https://www.serebii.net/pokemonchampions/pokemon.shtml';
const PAGE_URL = (slug: string): string => `https://www.serebii.net/pokedex-champions/${slug}/`;
/** 1 ページ取るごとに空ける時間（ミリ秒） */
const REQUEST_INTERVAL_MS = 1000;

const wait = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/**
 * 保存してあればそれを読み、なければ取って保存する
 * Serebii のページは ISO-8859-1 なので、latin1 で読む
 */
async function fetchCached(url: string, filePath: string): Promise<string> {
  if (fs.existsSync(filePath) && fs.statSync(filePath).size > 0) {
    return fs.readFileSync(filePath, 'latin1');
  }
  const response = await axios.get<ArrayBuffer>(url, { responseType: 'arraybuffer' });
  fs.writeFileSync(filePath, Buffer.from(response.data));
  await wait(REQUEST_INTERVAL_MS);
  return Buffer.from(response.data).toString('latin1');
}

async function main(): Promise<void> {
  const cacheDir = process.argv[2];
  if (!cacheDir) {
    throw new Error('ページを保存するフォルダを引数に書いてください');
  }
  fs.mkdirSync(cacheDir, { recursive: true });

  const listHtml = await fetchCached(LIST_URL, path.join(cacheDir, 'list.html'));
  const slugs = parseSerebiiChampionsSlugs(listHtml);
  console.log(`一覧のポケモン: ${slugs.length} 種類`);

  const learnsets: Record<number, ChampionsLearnsetEntry> = {};
  for (const slug of slugs) {
    const html = await fetchCached(PAGE_URL(slug), path.join(cacheDir, `${slug}.html`));
    const page = parseSerebiiChampionsPage(html);
    if (learnsets[page.nationalDex]) {
      throw new Error(`#${page.nationalDex} のページが 2 つあります（${slug}）`);
    }
    learnsets[page.nationalDex] = { name: page.name, moves: page.moves };
    if (page.otherFormTables.length > 0) {
      console.log(`  ${page.name}: 使わなかった表 ${page.otherFormTables.join(', ')}`);
    }
  }

  const retrievedAt = new Date().toISOString().slice(0, 10);
  fs.writeFileSync(
    CHAMPIONS_LEARNSETS_PATH,
    serializeChampionsLearnsets(
      learnsets,
      'https://www.serebii.net/pokedex-champions/<name>/ の Standard Moves の表',
      retrievedAt,
    ),
  );
  console.log(`${Object.keys(learnsets).length} 種類を ${CHAMPIONS_LEARNSETS_PATH} に書きました。`);
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
