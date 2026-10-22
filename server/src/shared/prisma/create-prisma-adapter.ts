import { PrismaPg } from '@prisma/adapter-pg';

/**
 * PrismaClient に渡す PostgreSQL 用のアダプタを作る
 * Prisma 7 から、PrismaClient は接続先をアダプタで受け取る（schema.prisma の url は使わない）
 *
 * 環境変数 DATABASE_URL を接続先に使う。呼ぶ前に dotenv で .env を読み込んでおくこと。
 */
export function createPrismaAdapter(): PrismaPg {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL が設定されていません。.env を確認してください。');
  }
  return new PrismaPg({ connectionString });
}
