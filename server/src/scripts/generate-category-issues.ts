/**
 * カテゴリ別のIssueを自動生成するスクリプト
 * テストスクリプトの結果に基づいて、カテゴリ別のIssueを作成する
 */

import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';
import { createPrismaAdapter } from '../shared/prisma/create-prisma-adapter';
import { AbilityRegistry } from '../modules/pokemon/domain/abilities/ability-registry';
import { MoveRegistry } from '../modules/pokemon/domain/moves/move-registry';
import { hasSpecialEffect } from './move-utils';
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// 環境変数を読み込む
dotenv.config();

const prisma = new PrismaClient({ adapter: createPrismaAdapter() });

/**
 * 特性のカテゴリ別Issue本文を生成
 */
function generateAbilityIssueBody(
  category: string,
  abilities: Array<{ name: string; nameEn: string; triggerEvent: string; effectCategory: string }>,
): string {
  const categoryName = getCategoryDisplayName(category);
  const triggerGroups: Record<string, typeof abilities> = {};

  // トリガー別にグループ化
  for (const ability of abilities) {
    const trigger = ability.triggerEvent;
    if (!triggerGroups[trigger]) {
      triggerGroups[trigger] = [];
    }
    triggerGroups[trigger].push(ability);
  }

  let body = `## 概要\n`;
  body += `${categoryName}カテゴリの未実装特性を実装する。\n\n`;
  body += `## 背景\n`;
  body += `現在、${categoryName}カテゴリの特性が${abilities.length}件未実装。\n\n`;
  body += `## 実装対象の特性（${abilities.length}件）\n\n`;

  // トリガー別にリスト化
  for (const [trigger, triggerAbilities] of Object.entries(triggerGroups)) {
    body += `### ${getTriggerDisplayName(trigger)} (${triggerAbilities.length}件)\n\n`;
    body += `| 日本語名 | 英語名 | トリガー | カテゴリ |\n`;
    body += `|---------|--------|---------|----------|\n`;
    triggerAbilities.forEach(ability => {
      // 日本語名が英語名と同じ場合は「-」を表示（PokeAPIに日本語名が存在しない場合）
      const displayName = ability.name === ability.nameEn ? '-' : ability.name;
      body += `| ${displayName} | ${ability.nameEn} | ${ability.triggerEvent} | ${ability.effectCategory} |\n`;
    });
    body += `\n`;
  }

  body += `## 対応内容\n`;
  body += `- 各特性のロジッククラスを実装\n`;
  body += `- 必要に応じて基底クラスを作成・拡張\n`;
  body += `- \`AbilityRegistry\`に登録\n`;
  body += `- テストケースを追加\n\n`;
  body += `## 注意事項\n`;
  body += `- 全ての特性を実装する必要がある（網羅性が重要）\n`;
  body += `- 実装完了後、テストスクリプト（\`npm run check:coverage\`）で網羅性を確認\n\n`;
  body += `## 参考\n`;
  body += `- \`server/src/modules/pokemon/domain/abilities/ability-registry.ts\`\n`;
  body += `- \`server/src/modules/pokemon/domain/abilities/effects/\`\n\n`;
  body += `## 優先度\n`;
  body += `中`;

  return body;
}

/**
 * 技のカテゴリ別Issue本文を生成
 */
function generateMoveIssueBody(
  category: string,
  moves: Array<{
    name: string;
    nameEn: string;
    category: string;
    power: number | null;
    accuracy: number | null;
    description: string | null;
  }>,
): string {
  const categoryName = getMoveCategoryDisplayName(category);

  let body = `## 概要\n`;
  body += `${categoryName}カテゴリの未実装技の特殊効果を実装する。\n\n`;
  body += `## 背景\n`;
  body += `現在、${categoryName}カテゴリの技が${moves.length}件未実装。\n\n`;
  body += `## 実装対象の技（${moves.length}件）\n\n`;
  body += `| 日本語名 | 英語名 | カテゴリ | 威力 | 命中率 | 説明 |\n`;
  body += `|---------|--------|---------|------|--------|------|\n`;
  moves.forEach(move => {
    // 日本語名が英語名と同じ場合は「-」を表示（PokeAPIに日本語名が存在しない場合）
    const displayName = move.name === move.nameEn ? '-' : move.name;
    const power = move.power !== null ? String(move.power) : '-';
    const accuracy = move.accuracy !== null ? String(move.accuracy) : '-';
    const description = move.description ? move.description.replace(/\n/g, ' ') : '-';
    body += `| ${displayName} | ${move.nameEn} | ${move.category} | ${power} | ${accuracy} | ${description} |\n`;
  });
  body += `\n`;

  body += `## 対応内容\n`;
  body += `- 各技の特殊効果ロジッククラスを実装\n`;
  body += `- 必要に応じて基底クラスを作成・拡張\n`;
  body += `- \`MoveRegistry\`に登録\n`;
  body += `- テストケースを追加\n\n`;
  body += `## 注意事項\n`;
  body += `- 全ての技を実装する必要がある（網羅性が重要）\n`;
  body += `- 実装完了後、テストスクリプト（\`npm run check:coverage\`）で網羅性を確認\n\n`;
  body += `## 参考\n`;
  body += `- \`server/src/modules/pokemon/domain/moves/move-registry.ts\`\n`;
  body += `- \`server/src/modules/pokemon/domain/moves/effects/\`\n\n`;
  body += `## 優先度\n`;
  body += `中`;

  return body;
}

/**
 * カテゴリ名を表示用に変換
 */
function getCategoryDisplayName(category: string): string {
  const map: Record<string, string> = {
    StatChange: 'ステータス変化',
    Immunity: '無効化',
    Weather: '天候',
    DamageModify: 'ダメージ修正',
    StatusCondition: '状態異常',
    Other: 'その他',
  };
  return map[category] || category;
}

/**
 * トリガー名を表示用に変換
 */
function getTriggerDisplayName(trigger: string): string {
  const map: Record<string, string> = {
    OnEntry: '場に出すとき',
    OnTakingDamage: 'ダメージを受けるとき',
    OnDealingDamage: 'ダメージを与えるとき',
    OnTurnEnd: 'ターン終了時',
    OnSwitchOut: '場から下がるとき',
    Passive: '常時発動',
    OnStatusCondition: '状態異常になったとき',
    Other: 'その他',
  };
  return map[trigger] || trigger;
}

/**
 * 技のカテゴリ名を表示用に変換
 */
function getMoveCategoryDisplayName(category: string): string {
  const map: Record<string, string> = {
    Physical: '物理',
    Special: '特殊',
    Status: '変化',
  };
  return map[category] || category;
}

/**
 * Issueタイトルを検証
 * - 改行やその他の制御文字を含まないことを確認する
 * @param title 検証するタイトル
 * @throws Error タイトルが無効な場合
 */
function validateIssueTitle(title: string): void {
  // 改行を含むかチェック
  if (title.includes('\n') || title.includes('\r')) {
    throw new Error('Issueタイトルに改行文字が含まれています。');
  }
  // 制御文字を含むかチェック（ASCII制御文字: 0x00-0x1F, 0x7F）
  for (let i = 0; i < title.length; i++) {
    const charCode = title.charCodeAt(i);
    if ((charCode >= 0x00 && charCode <= 0x1f) || charCode === 0x7f) {
      throw new Error('Issueタイトルに制御文字が含まれています。');
    }
  }
}

/**
 * GitHub Issueを作成
 */
async function createGitHubIssue(title: string, body: string): Promise<void> {
  try {
    // タイトルの検証
    validateIssueTitle(title);

    // 一時ファイルを作成して本文を書き込む
    const tempFile = path.join(os.tmpdir(), `issue-body-${Date.now()}.md`);
    fs.writeFileSync(tempFile, body, 'utf-8');

    try {
      // gh issue createコマンドを実行（コマンドインジェクション対策のためspawnを使用）
      const ghProcess = spawn('gh', ['issue', 'create', '--title', title, '--body-file', tempFile]);

      let stdout = '';
      let stderr = '';

      ghProcess.stdout.on('data', data => {
        stdout += data.toString();
      });

      ghProcess.stderr.on('data', data => {
        stderr += data.toString();
      });

      await new Promise<void>((resolve, reject) => {
        ghProcess.on('close', code => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`gh command exited with code ${code}`));
          }
        });
        ghProcess.on('error', error => {
          reject(error);
        });
      });

      if (stderr && !stderr.includes('Creating issue')) {
        console.error(`エラー: ${stderr}`);
      } else {
        console.log(`✅ Issue作成成功: ${stdout.trim()}`);
      }
    } finally {
      // 一時ファイルを削除
      if (fs.existsSync(tempFile)) {
        fs.unlinkSync(tempFile);
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error(`Issue作成エラー: ${error.message}`);
    } else {
      console.error('Issue作成エラー:', error);
    }
    // ghコマンドが失敗しても処理を続行
  }
}

/**
 * 特性のカテゴリ別Issueを生成
 */
async function generateAbilityIssues(createIssues: boolean = false): Promise<void> {
  console.log('=== 特性のカテゴリ別Issue生成 ===\n');

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

  for (const [category, abilities] of Object.entries(byCategory)) {
    if (abilities.length === 0) continue;

    const categoryName = getCategoryDisplayName(category);
    const title = `${categoryName}カテゴリの未実装特性の実装（${abilities.length}件）`;
    const body = generateAbilityIssueBody(category, abilities);

    console.log(`---\n`);
    console.log(`タイトル: ${title}\n`);
    if (!createIssues) {
      console.log(`本文:\n${body}\n`);
    }

    if (createIssues) {
      await createGitHubIssue(title, body);
    }
  }
}

/**
 * 技のカテゴリ別Issueを生成
 */
async function generateMoveIssues(createIssues: boolean = false): Promise<void> {
  console.log('\n\n=== 技のカテゴリ別Issue生成 ===\n');

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

  const movesWithSpecialEffects = allMoves.filter(move => hasSpecialEffect(move));

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

  for (const [category, moves] of Object.entries(byCategory)) {
    if (moves.length === 0) continue;

    const categoryName = getMoveCategoryDisplayName(category);
    const title = `${categoryName}カテゴリの未実装技の特殊効果の実装（${moves.length}件）`;
    const body = generateMoveIssueBody(category, moves);

    console.log(`---\n`);
    console.log(`タイトル: ${title}\n`);
    if (!createIssues) {
      console.log(`本文:\n${body}\n`);
    }

    if (createIssues) {
      await createGitHubIssue(title, body);
    }
  }
}

/**
 * メイン処理
 */
async function main(): Promise<void> {
  // コマンドライン引数から--createオプションを確認
  const createIssues = process.argv.includes('--create');

  try {
    await generateAbilityIssues(createIssues);
    await generateMoveIssues(createIssues);

    if (createIssues) {
      console.log('\n✅ 全てのIssue作成が完了しました');
    } else {
      console.log(
        '\n💡 Issueを作成するには、--createオプションを付けて実行してください: npm run generate:issues -- --create',
      );
    }
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

export { generateAbilityIssues, generateMoveIssues };
