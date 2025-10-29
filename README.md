# pxkxmxn

Nest.js + Prisma によるポケモンバトル環境の実験プロジェクト。

## 技術スタック

- Nest.js
- TypeScript
- Prisma
- Jest / ESLint / Prettier

## セットアップ

1. 依存関係のインストール
   - `cd server && npm install`
2. 環境変数の用意
   - プロジェクトルートに `.env` ファイルを作成し、以下の環境変数を設定:
     ```
     POSTGRES_USER=postgres
     POSTGRES_PASSWORD=postgres
     POSTGRES_DB=pxkxmxn
     POSTGRES_PORT=5432
     DATABASE_URL=postgresql://postgres:postgres@localhost:5432/pxkxmxn
     ```
3. データベースの起動
   - `cd server && npm run db:up` で PostgreSQL コンテナを起動
4. データベースマイグレーション
   - `cd server && npm run db:setup` で DB を起動しマイグレーションを実行
   - または個別に `npm run prisma:migrate` を実行
5. Prisma クライアント生成（初回またはスキーマ変更時）
   - `cd server && npm run prisma:generate`
6. アプリ起動
   - `cd server && npm run start:dev`

## 主なコマンド（server）

### アプリケーション
- `npm run start:dev` 開発モード起動
- `npm run build` ビルド
- `npm run test` ユニットテスト
- `npm run lint` Lint
- `npm run format` Prettier で整形

### データベース
- `npm run db:up` PostgreSQL コンテナを起動
- `npm run db:down` PostgreSQL コンテナを停止
- `npm run db:logs` PostgreSQL コンテナのログを表示
- `npm run db:reset` PostgreSQL コンテナをリセット（データも削除）
- `npm run db:setup` DB を起動しマイグレーションを実行

### Prisma
- `npm run prisma:generate` Prisma Client 生成
- `npm run prisma:migrate` データベースマイグレーション実行
- `npm run prisma:studio` Prisma Studio を起動（DB 可視化ツール）

## 設計ポリシー

詳細は `REQUIREMENT.md` を参照。データ（状態）は DB、ロジックはアプリ側で責務分離します。
