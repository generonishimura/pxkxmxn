# Server (Nest.js)

## 環境変数

- `cp .env.example .env` で作成し、値を調整します。
- 必須:
  - `DATABASE_URL` Prisma 用接続文字列
- 任意:
  - `PORT` アプリのリッスンポート（デフォルト 3000）

## Prisma

- スキーマ: `prisma/schema.prisma`
- 生成: `npm run prisma:generate`
- マイグレーション: `npm run prisma:migrate`
- Studio: `npm run prisma:studio`

## 開発コマンド

- `npm run start:dev` 開発起動
- `npm run test` テスト
- `npm run lint` Lint
- `npm run format` 整形

## 補足

- 設計ポリシーやドメイン方針はプロジェクトルートの `REQUIREMENT.md` を参照。
