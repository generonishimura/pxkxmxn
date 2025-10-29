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
   - `server/.env.example` を `server/.env` にコピーし、値を調整
3. Prisma クライアント生成
   - `npm run prisma:generate`
4. アプリ起動
   - `npm run start:dev`

## 主なコマンド（server）

- `npm run start:dev` 開発モード起動
- `npm run build` ビルド
- `npm run test` ユニットテスト
- `npm run lint` Lint
- `npm run format` Prettier で整形
- `npm run prisma:generate` Prisma Client 生成

## 設計ポリシー

詳細は `REQUIREMENT.md` を参照。データ（状態）は DB、ロジックはアプリ側で責務分離します。
