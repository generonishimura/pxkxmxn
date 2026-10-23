/**
 * すでに seed した DB に、チャンピオンズの技の上書きだけを当てる
 * seed をやり直すと PokeAPI から全件を取り直すため、上書きの表を変えたときはこちらを使う
 *
 * 使い方: npm run apply:champions-overrides
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';
import { createPrismaAdapter } from '../shared/prisma/create-prisma-adapter';
import {
  CHAMPIONS_MOVE_OVERRIDES,
  diffMoveOverride,
} from '../../prisma/seed-utils/champions-overrides';

// 環境変数を読み込む
dotenv.config();

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main(): Promise<void> {
  // タイプは PokeAPI のタイプ名（'grass' など）で引く。DB の nameEn は 'Grass' の形
  const types = await prisma.type.findMany();
  const typeIdByApiName = new Map(types.map(type => [type.nameEn.toLowerCase(), type.id]));
  const typeApiNameById = new Map(types.map(type => [type.id, type.nameEn.toLowerCase()]));

  let updated = 0;
  const notFound: string[] = [];
  for (const [name, override] of Object.entries(CHAMPIONS_MOVE_OVERRIDES)) {
    const move = await prisma.move.findUnique({ where: { name } });
    if (!move) {
      notFound.push(name);
      continue;
    }
    const current = {
      power: move.power,
      accuracy: move.accuracy,
      pp: move.pp,
      priority: move.priority,
      typeName: typeApiNameById.get(move.typeId) ?? '',
    };
    const { next, changes } = diffMoveOverride(current, override);
    if (changes.length === 0) {
      continue;
    }
    const typeId = typeIdByApiName.get(next.typeName);
    if (typeId === undefined) {
      throw new Error(`タイプ ${next.typeName} が DB にありません（技: ${name}）`);
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
    console.log(`  ${name}（${changes.join(', ')}）`);
  }

  console.log(`チャンピオンズの上書きを ${updated} 件の技に当てました。`);
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
