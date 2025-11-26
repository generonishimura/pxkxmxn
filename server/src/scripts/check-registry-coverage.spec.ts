/**
 * レジストリの網羅性チェックテスト
 * DBに存在する全ての技と特性がレジストリに登録されているかを確認する
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';
import { AbilityRegistry } from '../modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '../modules/pokemon/domain/moves/move-registry';

// 環境変数を読み込む
dotenv.config();

const prisma = new PrismaClient();

/**
 * 特性レジストリの網羅性をチェック
 */
async function checkAbilityRegistryCoverage(): Promise<void> {
  console.log('=== 特性レジストリの網羅性チェック ===\n');

  // DBから全ての特性を取得
  const allAbilities = await prisma.ability.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      triggerEvent: true,
      effectCategory: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // レジストリを初期化
  AbilityRegistry.initialize();
  const registeredAbilities = AbilityRegistry.listRegistered();

  // 実装されていない特性を特定
  const unimplementedAbilities = allAbilities.filter(
    ability => !registeredAbilities.includes(ability.name),
  );

  // カテゴリ別に分類
  const byCategory: Record<string, typeof unimplementedAbilities> = {};
  const byTrigger: Record<string, typeof unimplementedAbilities> = {};

  for (const ability of unimplementedAbilities) {
    // カテゴリ別
    const category = ability.effectCategory;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(ability);

    // トリガー別
    const trigger = ability.triggerEvent;
    if (!byTrigger[trigger]) {
      byTrigger[trigger] = [];
    }
    byTrigger[trigger].push(ability);
  }

  // 結果を表示
  console.log(`総特性数: ${allAbilities.length}`);
  console.log(`実装済み: ${registeredAbilities.length}`);
  console.log(`未実装: ${unimplementedAbilities.length}`);
  console.log(
    `実装率: ${((registeredAbilities.length / allAbilities.length) * 100).toFixed(2)}%\n`,
  );

  if (unimplementedAbilities.length > 0) {
    console.log('=== 未実装特性のカテゴリ別分類 ===');
    for (const [category, abilities] of Object.entries(byCategory)) {
      console.log(`\n[${category}] (${abilities.length}件)`);
      abilities.slice(0, 10).forEach(ability => {
        console.log(`  - ${ability.name} (${ability.nameEn}) - ${ability.triggerEvent}`);
      });
      if (abilities.length > 10) {
        console.log(`  ... 他 ${abilities.length - 10}件`);
      }
    }

    console.log('\n=== 未実装特性のトリガー別分類 ===');
    for (const [trigger, abilities] of Object.entries(byTrigger)) {
      console.log(`\n[${trigger}] (${abilities.length}件)`);
      abilities.slice(0, 10).forEach(ability => {
        console.log(`  - ${ability.name} (${ability.nameEn}) - ${ability.effectCategory}`);
      });
      if (abilities.length > 10) {
        console.log(`  ... 他 ${abilities.length - 10}件`);
      }
    }

    // カテゴリ別の詳細なリストを出力（Issue作成用）
    console.log('\n=== カテゴリ別未実装特性の詳細リスト（Issue作成用） ===');
    for (const [category, abilities] of Object.entries(byCategory)) {
      console.log(`\n## ${category}カテゴリ (${abilities.length}件)`);
      console.log('```');
      console.log('name,nameEn,triggerEvent,effectCategory');
      abilities.forEach(ability => {
        console.log(
          `${ability.name},${ability.nameEn},${ability.triggerEvent},${ability.effectCategory}`,
        );
      });
      console.log('```');
    }

    // トリガー別の詳細なリストを出力（Issue作成用）
    console.log('\n=== トリガー別未実装特性の詳細リスト（Issue作成用） ===');
    for (const [trigger, abilities] of Object.entries(byTrigger)) {
      console.log(`\n## ${trigger}トリガー (${abilities.length}件)`);
      console.log('```');
      console.log('name,nameEn,triggerEvent,effectCategory');
      abilities.forEach(ability => {
        console.log(
          `${ability.name},${ability.nameEn},${ability.triggerEvent},${ability.effectCategory}`,
        );
      });
      console.log('```');
    }

    // 未実装特性の一覧をCSV形式で出力（全体）
    console.log('\n=== 未実装特性一覧（全体・CSV形式） ===');
    console.log('name,nameEn,triggerEvent,effectCategory');
    unimplementedAbilities.forEach(ability => {
      console.log(
        `${ability.name},${ability.nameEn},${ability.triggerEvent},${ability.effectCategory}`,
      );
    });
  } else {
    console.log('✅ 全ての特性が実装されています！');
  }
}

/**
 * 技レジストリの網羅性をチェック
 */
async function checkMoveRegistryCoverage(): Promise<void> {
  console.log('\n\n=== 技レジストリの網羅性チェック ===\n');

  // DBから全ての技を取得
  const allMoves = await prisma.move.findMany({
    select: {
      id: true,
      name: true,
      nameEn: true,
      category: true,
      power: true,
      accuracy: true,
      description: true,
    },
    orderBy: {
      name: 'asc',
    },
  });

  // レジストリを初期化
  MoveRegistry.initialize();
  const registeredMoves = MoveRegistry.listRegistered();

  // 実装されていない技を特定
  // 注意: 全ての技に特殊効果があるわけではないため、特殊効果を持つ技のみをチェック
  // ここでは、descriptionに特殊効果の記述がある技を対象とする
  const movesWithSpecialEffects = allMoves.filter(move => {
    // 特殊効果を持つ可能性がある技を判定
    // 状態異常、ステータス変化、天候変更などのキーワードを含む
    const description = move.description?.toLowerCase() || '';
    const hasSpecialEffect =
      description.includes('burn') ||
      description.includes('paralyze') ||
      description.includes('freeze') ||
      description.includes('poison') ||
      description.includes('sleep') ||
      description.includes('flinch') ||
      description.includes('stat') ||
      description.includes('weather') ||
      description.includes('recoil') ||
      description.includes('multi-hit') ||
      description.includes('priority') ||
      move.category === 'Status'; // 変化技は全て特殊効果を持つ可能性がある

    return hasSpecialEffect;
  });

  const unimplementedMoves = movesWithSpecialEffects.filter(
    move => !registeredMoves.includes(move.name),
  );

  // カテゴリ別に分類
  const byCategory: Record<string, typeof unimplementedMoves> = {};

  for (const move of unimplementedMoves) {
    const category = move.category;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(move);
  }

  // 結果を表示
  console.log(`総技数: ${allMoves.length}`);
  console.log(`特殊効果を持つ可能性がある技: ${movesWithSpecialEffects.length}`);
  console.log(`実装済み: ${registeredMoves.length}`);
  console.log(`未実装（特殊効果あり）: ${unimplementedMoves.length}`);
  console.log(
    `実装率（特殊効果あり）: ${((registeredMoves.length / movesWithSpecialEffects.length) * 100).toFixed(2)}%\n`,
  );

  if (unimplementedMoves.length > 0) {
    console.log('=== 未実装技のカテゴリ別分類 ===');
    for (const [category, moves] of Object.entries(byCategory)) {
      console.log(`\n[${category}] (${moves.length}件)`);
      moves.slice(0, 10).forEach(move => {
        console.log(`  - ${move.name} (${move.nameEn})`);
      });
      if (moves.length > 10) {
        console.log(`  ... 他 ${moves.length - 10}件`);
      }
    }

    // カテゴリ別の詳細なリストを出力（Issue作成用）
    console.log('\n=== カテゴリ別未実装技の詳細リスト（Issue作成用） ===');
    for (const [category, moves] of Object.entries(byCategory)) {
      console.log(`\n## ${category}カテゴリ (${moves.length}件)`);
      console.log('```');
      console.log('name,nameEn,category,power,accuracy,description');
      moves.forEach(move => {
        console.log(
          `${move.name},${move.nameEn},${move.category},${move.power || ''},${move.accuracy || ''},"${move.description?.replace(/"/g, '""') || ''}"`,
        );
      });
      console.log('```');
    }

    // 未実装技の一覧をCSV形式で出力（全体）
    console.log('\n=== 未実装技一覧（全体・CSV形式） ===');
    console.log('name,nameEn,category,power,accuracy,description');
    unimplementedMoves.forEach(move => {
      console.log(
        `${move.name},${move.nameEn},${move.category},${move.power || ''},${move.accuracy || ''},"${move.description?.replace(/"/g, '""') || ''}"`,
      );
    });
  } else {
    console.log('✅ 全ての特殊効果を持つ技が実装されています！');
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  try {
    await checkAbilityRegistryCoverage();
    await checkMoveRegistryCoverage();
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// スクリプトとして実行
if (require.main === module) {
  main();
}

/**
 * カテゴリ別のIssue作成用データを取得
 */
async function getAbilityCategoryData(): Promise<
  Record<
    string,
    Array<{ name: string; nameEn: string; triggerEvent: string; effectCategory: string }>
  >
> {
  const allAbilities = await prisma.ability.findMany({
    select: {
      name: true,
      nameEn: true,
      triggerEvent: true,
      effectCategory: true,
    },
  });

  AbilityRegistry.initialize();
  const registeredAbilities = AbilityRegistry.listRegistered();
  const unimplementedAbilities = allAbilities.filter(
    ability => !registeredAbilities.includes(ability.name),
  );

  const byCategory: Record<string, typeof unimplementedAbilities> = {};
  for (const ability of unimplementedAbilities) {
    const category = ability.effectCategory;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(ability);
  }

  return byCategory;
}

/**
 * カテゴリ別のIssue作成用データを取得（技）
 */
async function getMoveCategoryData(): Promise<
  Record<
    string,
    Array<{
      name: string;
      nameEn: string;
      category: string;
      power: number | null;
      accuracy: number | null;
      description: string | null;
    }>
  >
> {
  const allMoves = await prisma.move.findMany({
    select: {
      name: true,
      nameEn: true,
      category: true,
      power: true,
      accuracy: true,
      description: true,
    },
  });

  MoveRegistry.initialize();
  const registeredMoves = MoveRegistry.listRegistered();

  const movesWithSpecialEffects = allMoves.filter(move => {
    const description = move.description?.toLowerCase() || '';
    const hasSpecialEffect =
      description.includes('burn') ||
      description.includes('paralyze') ||
      description.includes('freeze') ||
      description.includes('poison') ||
      description.includes('sleep') ||
      description.includes('flinch') ||
      description.includes('stat') ||
      description.includes('weather') ||
      description.includes('recoil') ||
      description.includes('multi-hit') ||
      description.includes('priority') ||
      move.category === 'Status';
    return hasSpecialEffect;
  });

  const unimplementedMoves = movesWithSpecialEffects.filter(
    move => !registeredMoves.includes(move.name),
  );

  const byCategory: Record<string, typeof unimplementedMoves> = {};
  for (const move of unimplementedMoves) {
    const category = move.category;
    if (!byCategory[category]) {
      byCategory[category] = [];
    }
    byCategory[category].push(move);
  }

  return byCategory;
}

export {
  checkAbilityRegistryCoverage,
  checkMoveRegistryCoverage,
  getAbilityCategoryData,
  getMoveCategoryData,
};
