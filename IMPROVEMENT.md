# Nest.js 改善提案

## 対応済み

- ✅ `src/modules/battle/domain/logic/damage-calculator.ts:137`  
  `Math.max(1, finalDamage)` によって最低ダメージが常に 1 となり、タイプ相性が無効でもダメージが発生してしまいます。タイプ相性に合わせて最小値を調整し、効果が 0 の場合は 0 ダメージを許容するようにしてください。
  - **対応済み**: 計算結果が0以下の場合は0を返すように修正（2024年対応）

- ✅ `src/modules/battle/domain/logic/damage-calculator.ts:147`  
  実際の攻撃・防御ステータスの代わりに `status.maxHp` を利用しており、正しい種族値・個体値・努力値が反映されません。計算済みステータスを `BattlePokemonStatus` に保持する、または `StatCalculator` の結果をダメージ計算に渡すようにして現実的なダメージへ近づける必要があります。
  - **対応済み**: `getEffectiveStat`メソッドで`baseStats`を必須にし、`maxHp`フォールバックを削除（2024年対応）

- ✅ `src/modules/battle/application/use-cases/start-battle.use-case.ts:23-88`  
  UseCase 層が直接 `PrismaService` に依存しており、アプリケーション層とインフラ層が密結合になっています。必要な読み取り処理をリポジトリやドメインサービス経由に切り出し、クリーンアーキテクチャの境界を保つことでテスト容易性を高められます。
  - **確認済み**: 既にリポジトリインターフェース経由で実装されており、PrismaServiceへの直接依存はなし（2024年確認）

- ✅ `src/modules/battle/application/use-cases/execute-turn.use-case.ts:160-198`  
  行動順決定ロジックが技の優先度、実数値の素早さ、状態異常による補正を考慮していません。`Move.priority` や計算済みの素早さステータスを取り入れることで、ゲーム仕様に近い処理へ改善できます。
  - **確認済み**: 既に優先度・実数値の素早さ・状態異常補正（まひ）・特性による速度補正を考慮した実装が完了（2024年確認）

## 今後の改善提案

（新しい改善点があればここに追加）
