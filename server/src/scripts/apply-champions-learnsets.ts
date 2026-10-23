/**
 * すでに seed した DB で、チャンピオンズで使えるポケモンの覚える技（pokemon_moves）を、
 * チャンピオンズの技（prisma/seed-utils/champions-learnsets.data.json）に入れ替える
 * 表にないポケモンは SV の技のまま残す。何度当てても結果は同じ
 *
 * 入れ替えたあと、育成ポケモンが持っている技（trained_pokemon_moves）のうち、
 * もう覚えられない技を出す（バトルを始めるときの確かめで止まるため）
 *
 * 使い方: npm run apply:champions-learnsets
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';
import { createPrismaAdapter } from '../shared/prisma/create-prisma-adapter';
import {
  applyChampionsLearnsets,
  summarizeMoveCounts,
} from '../../prisma/seed-utils/champions-learnsets';

// 環境変数を読み込む
dotenv.config();

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

async function main(): Promise<void> {
  const plan = await applyChampionsLearnsets(prisma);

  const { min, avg, max } = summarizeMoveCounts(plan.updates.map(update => update.moveIds.length));
  console.log(
    `${plan.updates.length} 種類のポケモンの技を、チャンピオンズの技に入れ替えました（1 種類あたり 最小 ${min}・平均 ${avg}・最大 ${max}）。`,
  );
  if (plan.unmatchedMoves.length > 0) {
    console.warn('DB に見つからなかった技:');
    for (const { nationalDex, name } of plan.unmatchedMoves) {
      console.warn(`  #${nationalDex}: ${name}`);
    }
    process.exitCode = 1;
  }
  if (plan.missingPokemon.length > 0) {
    console.warn(`DB に見つからなかったポケモン: ${plan.missingPokemon.join(', ')}`);
    process.exitCode = 1;
  }

  // 育成ポケモンが持っている技のうち、入れ替えたあとに覚えられなくなった技
  const trainedMoves = await prisma.trainedPokemonMove.findMany({
    include: { trainedPokemon: true, move: true },
  });
  const learnable = new Set(
    (await prisma.pokemonMove.findMany({ select: { pokemonId: true, moveId: true } })).map(
      row => `${row.pokemonId}-${row.moveId}`,
    ),
  );
  const notLearnable = trainedMoves.filter(
    row => !learnable.has(`${row.trainedPokemon.pokemonId}-${row.moveId}`),
  );
  if (notLearnable.length > 0) {
    console.warn(
      '育成ポケモンが持っている技のうち、覚えられなくなった技（技を選び直す必要があります）:',
    );
    for (const row of notLearnable) {
      console.warn(`  育成ポケモン ${row.trainedPokemonId}: ${row.move.name}`);
    }
  }
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
