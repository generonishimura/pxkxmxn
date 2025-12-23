import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { PrismaClient } from '@generated/prisma/client';

// 環境変数を読み込む
dotenv.config();

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
  error?: string;
}

const checks: CheckResult[] = [];

async function checkNodeModules(): Promise<void> {
  const nodeModulesPath = path.join(__dirname, '../../node_modules');
  const exists = fs.existsSync(nodeModulesPath);
  if (!exists) {
    checks.push({
      name: '依存関係のインストール',
      passed: false,
      message: 'node_modules が存在しません。npm install を実行してください。',
    });
    return;
  }
  checks.push({
    name: '依存関係のインストール',
    passed: true,
    message: 'node_modules が存在します。',
  });
}

async function checkEnvFile(): Promise<void> {
  const envPath = path.join(__dirname, '../../../.env');
  const exists = fs.existsSync(envPath);
  if (!exists) {
    checks.push({
      name: '環境変数ファイル',
      passed: false,
      message:
        '.env ファイルが存在しません。プロジェクトルートに .env ファイルを作成してください。',
    });
    return;
  }

  // .envファイルの内容を読み込んでDATABASE_URLを確認
  const envContent = fs.readFileSync(envPath, 'utf-8');
  const hasDatabaseUrl = envContent.includes('DATABASE_URL');

  checks.push({
    name: '環境変数ファイル',
    passed: true,
    message: hasDatabaseUrl
      ? '.env ファイルが存在し、DATABASE_URL が設定されています。'
      : '.env ファイルが存在しますが、DATABASE_URL が設定されていない可能性があります。',
  });
}

async function checkDockerContainer(): Promise<void> {
  try {
    const output = execSync('docker ps --filter "name=pxkxmxn-postgres" --format "{{.Status}}"', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    const isRunning = output.trim().length > 0 && output.includes('Up');
    if (!isRunning) {
      checks.push({
        name: 'PostgreSQLコンテナ',
        passed: false,
        message: 'PostgreSQLコンテナが起動していません。npm run db:up を実行してください。',
      });
      return;
    }
    checks.push({
      name: 'PostgreSQLコンテナ',
      passed: true,
      message: `PostgreSQLコンテナが起動しています: ${output.trim()}`,
    });
  } catch (error: any) {
    checks.push({
      name: 'PostgreSQLコンテナ',
      passed: false,
      message: `Dockerコマンドの実行に失敗しました: ${error.message}`,
      error: error.message,
    });
  }
}

async function checkPrismaClient(): Promise<void> {
  const prismaClientPath = path.join(__dirname, '../../generated/prisma/client.ts');
  const exists = fs.existsSync(prismaClientPath);
  if (!exists) {
    checks.push({
      name: 'Prismaクライアント',
      passed: false,
      message:
        'Prismaクライアントが生成されていません。npm run prisma:generate を実行してください。',
    });
    return;
  }
  checks.push({
    name: 'Prismaクライアント',
    passed: true,
    message: 'Prismaクライアントが生成されています。',
  });
}

async function checkDatabaseConnection(): Promise<void> {
  try {
    // Prismaクライアントを使用してデータベース接続をテスト
    const prisma = new PrismaClient();

    await prisma.$connect();

    // 簡単なクエリを実行して接続を確認
    await prisma.$queryRaw`SELECT 1`;

    await prisma.$disconnect();
    checks.push({
      name: 'データベース接続',
      passed: true,
      message: 'データベースへの接続に成功しました。',
    });
  } catch (error: any) {
    checks.push({
      name: 'データベース接続',
      passed: false,
      message: `データベースへの接続に失敗しました: ${error.message}`,
      error: error.message,
    });
  }
}

async function checkApplicationStartup(): Promise<void> {
  try {
    // TypeScriptのコンパイルチェック
    const tsConfigPath = path.join(__dirname, '../../tsconfig.json');
    const tsConfigExists = fs.existsSync(tsConfigPath);

    if (!tsConfigExists) {
      checks.push({
        name: 'アプリケーション起動',
        passed: false,
        message: 'tsconfig.json が存在しません。',
      });
      return;
    }

    // メインファイルの存在確認
    const mainPath = path.join(__dirname, '../main.ts');
    const mainExists = fs.existsSync(mainPath);

    if (!mainExists) {
      checks.push({
        name: 'アプリケーション起動',
        passed: false,
        message: 'main.ts が存在しません。',
      });
      return;
    }

    checks.push({
      name: 'アプリケーション起動',
      passed: true,
      message: 'アプリケーションの起動に必要なファイルが存在します。',
    });
  } catch (error: any) {
    checks.push({
      name: 'アプリケーション起動',
      passed: false,
      message: `アプリケーション起動チェックに失敗しました: ${error.message}`,
      error: error.message,
    });
  }
}

async function main() {
  console.log('環境チェックを開始します...\n');

  await checkNodeModules();
  await checkEnvFile();
  await checkDockerContainer();
  await checkPrismaClient();
  await checkDatabaseConnection();
  await checkApplicationStartup();

  console.log('\n=== 環境チェック結果 ===\n');
  let allPassed = true;

  checks.forEach(check => {
    const status = check.passed ? '✓' : '✗';
    const statusColor = check.passed ? '\x1b[32m' : '\x1b[31m';
    const resetColor = '\x1b[0m';
    console.log(`${statusColor}${status}${resetColor} ${check.name}: ${check.message}`);
    if (check.error) {
      console.log(`   エラー: ${check.error}`);
    }
    if (!check.passed) {
      allPassed = false;
    }
  });

  console.log('\n');
  if (allPassed) {
    console.log('すべてのチェックが成功しました！環境は正常に動作する準備ができています。');
    process.exit(0);
  } else {
    console.log('一部のチェックが失敗しました。上記のメッセージを確認して修正してください。');
    process.exit(1);
  }
}

main().catch(error => {
  console.error('環境チェック中にエラーが発生しました:', error);
  process.exit(1);
});
