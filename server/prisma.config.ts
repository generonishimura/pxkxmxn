import 'dotenv/config';
import { defineConfig } from 'prisma/config';

/**
 * Prisma CLI の設定
 * Prisma 7 から、接続先と seed のコマンドは schema.prisma / package.json ではなくここに書く
 *
 * DATABASE_URL は migrate など DB に接続するコマンドだけが使う。
 * prisma generate は DB に接続しないので、未設定でも動くように env() ではなく process.env で読む。
 */
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'ts-node prisma/seed.ts',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
