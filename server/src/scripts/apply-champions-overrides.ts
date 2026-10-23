/**
 * すでに seed した DB に、チャンピオンズの技の上書きだけを当てる
 * seed をやり直すと PokeAPI から全件を取り直すため、上書きの表を変えたときはこちらを使う
 * PP の決まり（toChampionsPp）は表にない技にも当たるため、DB のすべての技を見る。
 * 何度当てても結果は変わらない（変えたあとの PP に、PP の決まりをもう一度当てても同じ値になる）
 *
 * 使い方: npm run apply:champions-overrides
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';
import { createPrismaAdapter } from '../shared/prisma/create-prisma-adapter';
import {
  CHAMPIONS_MOVE_OVERRIDES,
  diffMoveOverride,
  findUnusedOverrideNames,
  resolveMoveOverride,
} from '../../prisma/seed-utils/champions-overrides';

// 環境変数を読み込む
dotenv.config();

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main(): Promise<void> {
  // タイプは PokeAPI のタイプ名（'grass' など）で引く。DB の nameEn は 'Grass' の形
  const types = await prisma.type.findMany();
  const typeIdByApiName = new Map(types.map(type => [type.nameEn.toLowerCase(), type.id]));
  const typeApiNameById = new Map(types.map(type => [type.id, type.nameEn.toLowerCase()]));

  const moves = await prisma.move.findMany({ orderBy: { id: 'asc' } });
  let updated = 0;
  // PP がどう変わったか（'10 → 12' ごとの件数）
  const ppChangeCounts = new Map<string, number>();
  for (const move of moves) {
    const current = {
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      priority: move.priority,
      typeName: typeApiNameById.get(move.typeId) ?? '',
    };
    const override = resolveMoveOverride(move.name, move.pp);
    const { next, changes } = diffMoveOverride(current, override);
    if (changes.length === 0) {
      continue;
    }
    const typeId = typeIdByApiName.get(next.typeName);
    if (typeId === undefined) {
      throw new Error(`タイプ ${next.typeName} が DB にありません（技: ${move.name}）`);
    }
    await prisma.move.update({
      where: { id: move.id },
      data: {
        power: next.power,
        accuracy: next.accuracy,
        pp: next.pp,
        priority: next.priority,
        typeId,
      },
    });
    updated++;
    if (next.pp !== move.pp) {
      const key = `${move.pp} → ${next.pp}`;
      ppChangeCounts.set(key, (ppChangeCounts.get(key) ?? 0) + 1);
    }
    // PP の決まりだけで変わった技は数が多いため、1 件ずつは出さない
    if (move.name in CHAMPIONS_MOVE_OVERRIDES) {
      console.log(`  ${move.name}（${changes.join(', ')}）`);
    }
  }

  console.log(`チャンピオンズの上書きを ${updated} 件の技に当てました。`);
  if (ppChangeCounts.size > 0) {
    console.log('PP の変わり方（変える前 → 変えたあと: 件数）:');
    for (const [key, count] of [...ppChangeCounts].sort()) {
      console.log(`  ${key}: ${count} 件`);
    }
  }
  const notFound = findUnusedOverrideNames(
    CHAMPIONS_MOVE_OVERRIDES,
    new Set(moves.map(move => move.name)),
  );
  if (notFound.length > 0) {
    console.warn(`DB に見つからなかった技: ${notFound.join(', ')}`);
    process.exitCode = 1;
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
