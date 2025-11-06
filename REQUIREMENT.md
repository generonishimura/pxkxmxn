# ポケモンバトルシステム設計概要

本ドキュメントは、Nest.js、クリーンアーキテクチャ、および Prisma を使用して、スケーラブルなポケモンバトル環境を構築するためのシステム設計をまとめたものである。

## 1. 基本設計思想：データとロジックの分離

本システムの設計における最も重要な原則は、「データ（状態）」と「ロジック（振る舞い）」を厳密に分離することである。

- **データベース (DB) の役割**
  - 例: 「カイリューの特性は『マルチスケイル』である」という状態を永続化する。
  - ロジックそのもの（例: 「HP が満タンならダメージ半減」）は DB に保存しない。

- **アプリケーション (バトルエンジン) の役割**
  - DB から取得した「マルチスケイル」という名前（識別子）に基づき、ハードコードされたロジックを実行する。

## 2. 複雑なロジック（特性・技）の管理

特に「特性」のように複雑で将来的に拡張されうる（例: 1000 種類を超える）ロジックは、以下の設計アプローチを採用する。

### 2.1. マスターデータの役割 (Prisma / DB)

Ability や Move のマスターテーブルは、ロジックの「補助」に徹する。

- **name (String)**: アプリケーション側がロジックを識別するための一意なキー（例: `Intimidate`, `Levitate`）。
- **description (String)**: UI 表示用の説明文。
- **triggerEvent (String / Enum)**: ロジックの発動タイミングを示す補助フラグ（例: `OnEntry`, `OnTakingDamage`, `Passive`）。
- **effectCategory (String / Enum)**: 効果の大まかな分類（例: `StatChange`, `Immunity`, `Weather`）。

### 2.2. アプリケーション（バトルエンジン）のアーキテクチャ

switch 文による巨大な分岐処理は、保守性・拡張性の観点から採用しない。代わりに Strategy パターンとレジストリ（Registry）パターンを採用する。

- **インターフェース定義**: 特性ロジックの共通規格（例: `IAbilityEffect`）を定義する。これには `onEntry()`, `modifyDamage()`, `onTurnEnd()` といった、様々な発動タイミングに対応するメソッドシグネチャが含まれる。
- **ロジックの実装**: 特性ごとに、インターフェースを実装した個別のクラス（または関数）を作成する（例: `IntimidateEffect.ts`, `LevitateEffect.ts`）。
- **レジストリ（登録簿）**: DB の name（文字列キー）と、上記で実装したロジッククラスを紐付ける Map を作成する（例: `Map<string, IAbilityEffect>`）。
  - 例: `abilityRegistry.set('いかく', new IntimidateEffect())`
- **バトルエンジンの実行**: `triggerEvent` に基づいて処理を行う。巨大な switch 文の代わりに、DB から取得した特性の `name` をキーとしてレジストリを呼び出し、該当するロジックを実行する。

バトルエンジンの擬似コード（`onEntry` イベント）:

```ts
const abilityName = pokemon.ability.name; // DB から取得した名前
const event = pokemon.ability.triggerEvent; // DB から取得したトリガー

if (event === 'OnEntry') {
  // switch 文ではなく、Map からロジックを取得
  const effectLogic = abilityRegistry.get(abilityName);
  if (effectLogic) {
    effectLogic.onEntry(pokemon, battleContext);
  }
}
```

## 3. 技術スタックとアーキテクチャ

- **フレームワーク**: Nest.js
- **アーキテクチャ**: クリーンアーキテクチャ
- **ORM**: Prisma
- **リアルタイム通信**: WebSocket (Nest.js Gateway)

### 3.1. クリーンアーキテクチャのレイヤー構造

依存性のルール（内側は外側を知らない）を厳守する。

- **ドメイン (Entities)**
  - システムの中核。Nest.js や Prisma に依存しない純粋な TypeScript クラス。
  - 例: `Pokemon`, `Battle`, `BattlePokemonStatus` といったエンティティ、`DamageCalculator` などのドメインロジック。
  - `*.repository.interface.ts`（抽象リポジトリ）もここに定義する。

- **アプリケーション (Use Cases)**
  - ビジネスロジック。ドメイン層をオーケストレーション（指揮）する。
  - 例: `ExecuteTurnUseCase`（ターン処理）, `StartBattleUseCase`（バトル開始）。

- **インフラストラクチャ (Interface Adapters)**
  - 外界とアプリケーション層を接続する。
  - `*.controller.ts`: HTTP リクエストを処理し、ユースケースを呼び出す。
  - `*.gateway.ts`: WebSocket 通信を処理し、ユースケースを呼び出す。
  - `*.prisma.repository.ts`: ドメイン層で定義された `*.repository.interface.ts` の具象実装。Prisma Client をここで使用する。

- **フレームワーク (Frameworks & Drivers)**
  - Nest.js 自体、Prisma Client、PostgreSQL など。

### 3.2. ディレクトリ構造（抜粋）

`src/modules` 配下に、機能ドメインごとにモジュールを分割する。

```text
src/
├── modules/
│   ├── battle/           # バトル進行モジュール
│   │   ├── domain/
│   │   │   ├── entities/
│   │   │   ├── logic/      # DamageCalculator, AbilityRegistry など
│   │   │   └── battle.repository.interface.ts
│   │   ├── application/
│   │   │   └── use-cases/  # ExecuteTurnUseCase など
│   │   ├── infrastructure/
│   │   │   ├── persistence/  # battle.prisma.repository.ts
│   │   │   ├── battle.controller.ts
│   │   │   └── battle.gateway.ts
│   │   └── battle.module.ts
│   │
│   ├── pokemon/          # ポケモンマスターデータ管理モジュール
│   │   ├── domain/
│   │   │   ├── entities/   # Pokemon, Move, Ability
│   │   │   └── pokemon.repository.interface.ts
│   │   ├── application/
│   │   ├── infrastructure/
│   │   └── pokemon.module.ts
│   │
│   └── trainer/          # ユーザー・育成個体管理モジュール
│       ├── domain/
│       ├── application/
│       ├── infrastructure/
│       └── trainer.module.ts
│
└── shared/               # 共有リソース（PrismaModule など）
```

## 4. Prisma スキーマ設計のハイライト

`prisma/schema.prisma` は、以下の 3 つの主要カテゴリで構成される。

- **静的マスターデータ**
  - `Pokemon`, `Type`, `Move`, `Ability`, `Item`, `Nature`, `TypeEffectiveness`
  - これらはゲームのバージョンによって定義される不変のデータ。

- **ユーザーデータ（動的データ）**
  - `Trainer`: ユーザーアカウント。
  - `TrainedPokemon`: ユーザーが育成した個体（個体値、努力値、技構成など）。
  - `Team`: `TrainedPokemon` で構成されるバトルチーム。

- **バトルデータ（揮発性データ）**
  - `Battle`: バトル全体の状態（天候、ターン数、フィールド状態）。
  - `BattlePokemonStatus`: 最も重要。バトル中のポケモン個別の状態（現在の HP、状態異常、ランク補正）を管理する。`Battle` と `TrainedPokemon` に関連付けられる。

## 5. 開発プロセスと品質保証

セーフティネットとして、以下の開発ルールを設ける

### 5.1. ブランチ管理

- **mainブランチへの直接コミットは禁止**
  - 機能追加・修正・リファクタリングを行う場合は、必ず適切な名前のブランチを作成してから作業を開始
  - コミット前に現在のブランチを確認し、mainブランチの場合はブランチを作成してからコミット
  - ブランチ命名規則: `feat/`, `fix/`, `refactor/`, `chore/`, `docs/` のプレフィックスを使用

### 5.2. テストと動作確認

- **新規ロジックを追加した場合は、必ずテストケースを追加するか、動作確認を行うこと**
  - ドメインロジック（計算ロジック、バリデーションなど）はテストケースを追加し、テストを実行して成功することを確認
  - インフラストラクチャ層（API、WebSocketなど）は実際にアプリを起動して動作確認を行う
  - テストケースを追加した場合は、必ずテストを実行して成功することを確認してからコミット

### 5.3. コミット前チェック項目

コミット前に、以下の項目を**必ず**確認する。

- 現在のブランチがmainでないことを確認
- `npm run lint` がエラーなく通過すること
- `npm run build` が成功すること
- 新規ロジックを追加した場合、最低限のテストまたは動作確認を行ったこと
- Prismaスキーマを変更した場合、マイグレーションが必要な場合は準備したこと

### 5.4. コミットメッセージ規約

すべてのコミットメッセージは、Conventional Commits 形式に従う。

- `feat`: 新機能
- `fix`: バグ修正
- `refactor`: リファクタリング
- `docs`: ドキュメントのみの変更
- `test`: テストの追加・変更
- `chore`: ビルドプロセスやツールの変更
- `style`: コードの動作に影響しない変更（フォーマット、空白など）