# バトルエンジンのフック一覧

技・特性の効果を実装するときに使うフックとコンテキストの一覧です。
この文書だけを見て実装できるように、呼ばれる場所と例を書いています。

- 特性のフック: `src/modules/pokemon/domain/abilities/ability-effect.interface.ts`（`IAbilityEffect`）
- 技のフック: `src/modules/pokemon/domain/moves/move-effect.interface.ts`（`IMoveEffect`）
- コンテキスト: `src/modules/pokemon/domain/abilities/battle-context.interface.ts`（`BattleContext`）

## 1. 技を使ったときの処理の順番

`MoveExecutorService.executeMove`（`src/modules/battle/application/services/move-executor.service.ts`）は次の順で処理します。

1. ヒット共通のコンテキストを作る（技名・技フラグ・効果のある天候・実数値・無視するランク）
2. 防御側特性の `isImmuneToMove` で技そのものを無効にするか判定する（変化技も含む）
3. 命中判定（`AccuracyCalculator.checkHit`）
4. 変化技なら `onUse` を呼んで終わり（威力が null で `modifyMovePower` もない攻撃技も、今までどおりここで終わる）
5. 技の `beforeDamage`（連続技の回数決定）
6. 技のタイプを決める（技の `modifyMoveType` → 攻撃側特性の `modifyMoveType`）
7. 技の威力を決める（技の `modifyMovePower`）
8. ヒットごとにダメージを計算して当てる（連続技・おやこあいの追加ヒット）。ひんしかダメージ0で止まる
9. 接触時の特性（`applyContactStatusCondition`）→ 技の `onHit` → 技の `afterDamage`（実際に減らしたHPの合計）

`DamageCalculator.calculate`（`src/modules/battle/domain/logic/damage-calculator.ts`）の中は次の順です。

1. タイプ一致・タイプ相性（攻撃側特性の `ignoresTypeImmunity` で相性0を等倍にできる）
2. 防御側特性の `isImmuneToType`
3. 威力補正（攻撃側特性の `modifyBasePower` → 場の特性の `modifyAnyBasePower`）
4. 能力値とランク（`attackStatOverride`、無視するランク、やけど半減）
5. 基本ダメージ → 攻撃側特性の `modifyDamageDealt` → 防御側特性の `modifyDamage` → 天候補正

## 2. 技のフック（IMoveEffect）

### modifyMovePower

- シグネチャ: `modifyMovePower?(attacker, defender, battleContext): number | undefined`
- 呼ばれる場所: `executeMove`。タイプ決定のあと、ダメージ計算の前に1回
- 使う技: たたりめ、ベノムショック、からげんき、アシストパワー、つけあがる、おしおき、ウェザーボール
- 戻り値は変更後の威力です。`battleContext.moveTypeName` は変更後のタイプ、`battleContext.weather` は効果のある天候です。
- 威力が null の攻撃技（DB の威力が null のおしおきなど）は、`modifyMovePower` を持たせるとダメージ技として扱われ、命中判定とダメージ計算をします。`undefined` を返して威力が決まらない場合は、ダメージを与えずに終わります。

```ts
modifyMovePower(_attacker: BattlePokemonStatus, defender: BattlePokemonStatus): number | undefined {
  return defender.statusCondition === StatusCondition.Poison ? 130 : undefined;
}
```

### modifyMoveType

- シグネチャ: `modifyMoveType?(attacker, defender, battleContext): string | undefined`
- 呼ばれる場所: `executeMove`。`beforeDamage` のあと、攻撃側特性の `modifyMoveType` の前
- 使う技: ウェザーボール
- 戻り値は日本語のタイプ名（例: `'ほのお'`）です。エンジンが `ITypeEffectivenessRepository.findTypeByName` でタイプを引き、タイプ一致・相性・天候補正に使います。

```ts
modifyMoveType(_a: BattlePokemonStatus, _d: BattlePokemonStatus, ctx: BattleContext): string | undefined {
  return getContextWeather(ctx) === Weather.Sun ? 'ほのお' : undefined;
}
```

### ignoredDefenderRanks（プロパティ）

- 型: `readonly ignoredDefenderRanks?: readonly StatType[]`
- 参照する場所: `executeMove` がコンテキストの `ignoredDefenderRanks` にまとめ、ダメージ計算と命中判定で使う
- 使う技: なしくずし、せいなるつるぎ、ＤＤラリアット

```ts
export class ChipAwayEffect implements IMoveEffect {
  readonly ignoredDefenderRanks = ['defense', 'specialDefense', 'evasion'] as const;
}
```

### attackStatOverride（プロパティ）

- 型: `readonly attackStatOverride?: { source: 'attacker' | 'defender'; stat: 'attack' | 'defense' | 'specialAttack' | 'specialDefense' }`
- 参照する場所: `DamageCalculator`。指定した側の実数値とランクで攻撃側の能力を計算する
- 使う技: イカサマ（相手の攻撃）、ボディプレス（自分の防御）

```ts
export class FoulPlayEffect implements IMoveEffect {
  readonly attackStatOverride = { source: 'defender', stat: 'attack' } as const;
}
```

### ignoresBurnPenalty（プロパティ）

- 型: `readonly ignoresBurnPenalty?: boolean`
- 参照する場所: `DamageCalculator`。やけどによる物理技の半減をしない
- 使う技: からげんき

```ts
export class FacadeEffect implements IMoveEffect {
  readonly ignoresBurnPenalty = true;
}
```

### hasRecoil（プロパティ）

- 型: `readonly hasRecoil?: boolean`
- 参照する場所: `executeMove` がコンテキストの `hasRecoil` に入れる。すてみが威力を1.2倍にする
- 使う技: `BaseRecoilEffect`（反動技）と `BaseCrashDamageEffect`（とびげりなど）が `true` を持つ。わるあがきは持たない

### beforeDamage / afterDamage（呼ばれるようになった既存フック）

- `beforeDamage(attacker, defender, move, battleContext)`: 命中後、タイプ決定の前に1回。`battleContext.multiHitCount` を2以上にすると、その回数だけダメージを与えます（`BaseMultiHitEffect` が使う）。
- `afterDamage(attacker, defender, damage, battleContext)`: `onHit` のあとに1回。`damage` は全ヒットで実際に減らしたHPの合計です（反動技など）。相手の残りHPを超えた分は入りません。

```ts
async beforeDamage(_a: BattlePokemonStatus, _d: BattlePokemonStatus, _m: Move, ctx: BattleContext) {
  ctx.multiHitCount = 2;
}
```

## 3. 特性のフック（IAbilityEffect）

### modifyBasePower（攻撃側）

- シグネチャ: `modifyBasePower?(pokemon, power, battleContext): number | undefined`
- 呼ばれる場所: `DamageCalculator`。ダメージ計算式に入る前の威力に掛かる
- 使う特性: てつのこぶし、がんじょうあご、メガランチャー、かたいツメ、きれあじ、パンクロック（攻撃側）、アナライズ、テクニシャン
- `power` はヒットごとの威力です（技の `modifyMovePower` とおやこあいの追加ヒットの補正のあと）。威力で判定する特性（テクニシャンなど）は `battleContext.movePower` ではなくこの値を使います。
- 補正は `modifyByFixedPoint` で4096分率を使います（1.2倍 = 4915、1.3倍 = 5325、1.5倍 = 6144）。

```ts
modifyBasePower(_p: BattlePokemonStatus, power: number, ctx?: BattleContext): number | undefined {
  return ctx?.moveFlags?.has('punch') ? modifyByFixedPoint(power, 4915) : undefined;
}
```

### modifyAnyBasePower（場の全員）

- シグネチャ: `modifyAnyBasePower?(holder, power, battleContext): number | undefined`
- 呼ばれる場所: `DamageCalculator`。攻撃側と防御側の特性の両方で呼ばれる（同じ特性が両側にあれば1回）。かたやぶりでは無視されない
- 使う特性: ダークオーラ、フェアリーオーラ（オーラブレイクは `attackerAbilityName` / `defenderAbilityName` で判定）

```ts
modifyAnyBasePower(_h: BattlePokemonStatus, power: number, ctx?: BattleContext): number | undefined {
  if (ctx?.moveTypeName !== 'あく') return undefined;
  const broken = [ctx.attackerAbilityName, ctx.defenderAbilityName].includes('オーラブレイク');
  return modifyByFixedPoint(power, broken ? 3072 : 5448);
}
```

### modifyMoveType（攻撃側）

- シグネチャ: `modifyMoveType?(pokemon, typeName, battleContext): string | undefined`
- 呼ばれる場所: `executeMove`。技の `modifyMoveType` のあと
- 使う特性: うるおいボイス（-スキン系も同じ形で書ける）

```ts
modifyMoveType(_p: BattlePokemonStatus, _type: string, ctx?: BattleContext): string | undefined {
  return ctx?.moveFlags?.has('sound') ? 'みず' : undefined;
}
```

### modifyMoveFlags（攻撃側）

- シグネチャ: `modifyMoveFlags?(pokemon, flags, battleContext): ReadonlySet<MoveFlag> | undefined`
- 呼ばれる場所: `executeMove`。コンテキストを作るとき1回
- 使う特性: えんかく（`contact` を外す）。接触時の特性は `isContactMove` で判定するので、自動で発動しなくなります。

```ts
modifyMoveFlags(_p: BattlePokemonStatus, flags: ReadonlySet<MoveFlag>): ReadonlySet<MoveFlag> {
  return new Set([...flags].filter(flag => flag !== 'contact'));
}
```

### ignoreOpponentRanks

- シグネチャ: `ignoreOpponentRanks?(pokemon, role: 'attacker' | 'defender', battleContext): readonly StatType[] | undefined`
- 呼ばれる場所: `executeMove`。攻撃側特性は `role = 'attacker'`（結果は `ignoredDefenderRanks`）、防御側特性は `role = 'defender'`（結果は `ignoredAttackerRanks`）。防御側はかたやぶりで無視される
- 使う特性: てんねん、しんがん（回避ランク）、するどいめ（回避ランク）

```ts
ignoreOpponentRanks(_p: BattlePokemonStatus, role: 'attacker' | 'defender'): readonly StatType[] {
  return role === 'attacker' ? ['defense', 'specialDefense', 'evasion'] : ['attack', 'specialAttack', 'accuracy'];
}
```

### ignoresTypeImmunity（攻撃側）

- シグネチャ: `ignoresTypeImmunity?(pokemon, moveTypeName, defenderTypeName, battleContext): boolean | undefined`
- 呼ばれる場所: `DamageCalculator`。相手のタイプごとに、相性が0のときだけ
- 使う特性: しんがん、きもったま

```ts
ignoresTypeImmunity(_p: BattlePokemonStatus, moveType: string, defenderType: string): boolean {
  return defenderType === 'ゴースト' && (moveType === 'ノーマル' || moveType === 'かくとう');
}
```

### isImmuneToMove（防御側）

- シグネチャ: `isImmuneToMove?(pokemon, battleContext): boolean | undefined`
- 呼ばれる場所: `executeMove`。命中判定の前。変化技を含む、相手を対象にする技（`MoveFlags.targetsOpponent`）だけ。かたやぶりで無視される
- 使う特性: ぼうおん、ぼうだん、ぼうじん（粉技）、かぜのり（変化技の風技）
- `true` を返すと PP だけ減り、`Used <技> but it had no effect` になります。能力を上げるなどの副作用が要る場合は、ダメージ技なら `isImmuneToType` + `onAfterTakingDamage` を使います。

```ts
isImmuneToMove(_p: BattlePokemonStatus, ctx?: BattleContext): boolean {
  return ctx?.moveFlags?.has('sound') === true;
}
```

### isImmuneToType（既存。コンテキストが増えた）

- 呼ばれる場所: `DamageCalculator`。`battleContext.typeEffectiveness` と `moveFlags` が入るようになりました。混乱の自傷では呼ばれません
- 使う特性: ふしぎなまもり（効果抜群以外を無効）、ぼうだん・かぜのりのダメージ技部分

```ts
isImmuneToType(_p: BattlePokemonStatus, _type: string, ctx?: BattleContext): boolean {
  return (ctx?.typeEffectiveness ?? 1) <= 1;
}
```

### modifyMultiHitCount（攻撃側）

- シグネチャ: `modifyMultiHitCount?(pokemon, minHits, maxHits, battleContext): number | undefined`
- 呼ばれる場所: `BaseMultiHitEffect.beforeDamage`
- 使う特性: スキルリンク

```ts
modifyMultiHitCount(_p: BattlePokemonStatus, _min: number, max: number): number {
  return max;
}
```

### getAdditionalHitPowerRatios（攻撃側）

- シグネチャ: `getAdditionalHitPowerRatios?(pokemon, battleContext): readonly number[] | undefined`
- 呼ばれる場所: `executeMove`。連続技ではない攻撃技のときだけ
- 使う特性: おやこあい（`[0.25]`）。追加ヒットの威力は `modifyByFixedPoint(power, 0.25, 1)` で計算されます。
- 注: `onHit`（追加効果）と接触時の特性は、ヒット数にかかわらず1回だけです。

```ts
getAdditionalHitPowerRatios(_p: BattlePokemonStatus, ctx?: BattleContext): readonly number[] | undefined {
  return ctx?.moveName === 'じばく' ? undefined : [0.25];
}
```

### 特性のプロパティ

| プロパティ | 型 | 参照する場所 | 使う特性 |
| --- | --- | --- | --- |
| `suppressesWeather` | `boolean` | `resolveEffectiveWeather`（技の実行・行動順・ターン終了時） | ノーてんき、エアロック |
| `breaksMold` | `boolean` | `AbilityRegistry.hasMoldBreaker` | かたやぶり、テラボルテージ、ターボブレイズ |
| `unaffectedByMoldBreaker` | `boolean` | `AbilityRegistry.isIgnoredByMoldBreaker` | プリズムアーマー |
| `secondaryEffectChanceMultiplier` | `number` | `rollSecondaryEffect`（攻撃側） | てんのめぐみ（`2`） |
| `blocksSecondaryEffects` | `boolean` | `rollSecondaryEffect`（防御側、かたやぶりで無視） | りんぷん |
| `preventsRecoil` | `boolean` | `BaseRecoilEffect.afterDamage`（攻撃側） | いしあたま、マジックガード |

テラボルテージ・ターボブレイズは `MoldBreakerEffect` をそのまま登録します。

```ts
this.registry.set('テラボルテージ', new MoldBreakerEffect());
export class CloudNineEffect implements IAbilityEffect { readonly suppressesWeather = true; }
export class SereneGraceEffect implements IAbilityEffect { readonly secondaryEffectChanceMultiplier = 2; }
```

## 4. コンテキストの項目（BattleContext）

| 項目 | 内容 | 入る場所 |
| --- | --- | --- |
| `moveName` | 技名（DB の name） | 技の実行・行動順 |
| `moveFlags` | 技フラグ（`modifyMoveFlags` の反映後） | 技の実行・行動順・ダメージ計算 |
| `moveTypeName` | 技のタイプ名（タイプ変更の反映後） | 技の実行・行動順・ダメージ計算 |
| `movePower` | 技の威力（`modifyMovePower` の反映後、特性補正の前） | 技の実行・ダメージ計算 |
| `movePriority` | 技の優先度（特性補正の前） | 技の実行・行動順 |
| `attackerAbilityName` / `defenderAbilityName` | 攻撃側・防御側の特性名 | 技の実行・行動順・ダメージ計算 |
| `attacker` / `defender` | 攻撃側・防御側の最新の状態（ランク・HP・状態異常） | 技の実行・ダメージ計算。行動順では `attacker` が行動するポケモン |
| `attackerStats` / `defenderStats` | ランク補正前の実数値 | 技の実行・ダメージ計算。行動順では `attackerStats` が行動するポケモン |
| `typeEffectiveness` | このヒットのタイプ相性（0〜4） | ダメージ計算中の特性フック |
| `weather` | 効果のある天候（ノーてんき等がいれば `None`） | 技の実行・行動順・ターン終了時・ダメージ計算 |
| `isLastToMove` | このターン最後に行動するか | 技の実行・ダメージ計算 |
| `hasRecoil` | 反動・外したときの自傷がある技か（技の `hasRecoil`） | 技の実行・ダメージ計算 |
| `multiHitCount` / `hitIndex` | 総ヒット数 / 何回目のヒットか（0始まり） | 技の実行・ダメージ計算 |
| `ignoredAttackerRanks` / `ignoredDefenderRanks` | 0として扱うランク | 技の実行・命中判定・ダメージ計算 |
| `secondaryEffectChanceMultiplier` / `secondaryEffectsSuppressed` | 追加効果の確率倍率 / 相手への追加効果の無効化 | ダメージ技の `beforeDamage` 以降・`onHit` |

## 5. 補助関数

| 関数 | 場所 | 用途 |
| --- | --- | --- |
| `MoveFlags.get(name)` / `MoveFlags.has(name, flag)` | `pokemon/domain/moves/move-flags.ts` | 技フラグを引く |
| `MoveFlags.targetsOpponent(name)` | 同上 | 相手を対象にする技か |
| `isContactMove(ctx)` | 同上 | 接触技か（`moveFlags` がなければ物理技で近似） |
| `rollSecondaryEffect(chance, ctx, 'target' \| 'self')` | `pokemon/domain/moves/secondary-effect.ts` | 追加効果の発動判定。追加効果は必ずこれで判定する |
| `getContextWeather(ctx)` | `pokemon/domain/abilities/context-weather.ts` | 効果のある天候。`battle.weather` を直接読まない |
| `resolveEffectiveWeather(weather, abilityNames)` | `battle/domain/logic/effective-weather.ts` | エンジン用。場の特性から効果のある天候を求める |
| `getHighestStat(stats, status)` | `battle/domain/logic/highest-stat.ts` | ランク込みで最も高い能力（こだいかっせい、クォークチャージ） |
| `modifyByFixedPoint(value, numerator, denominator = 4096)` | `battle/domain/logic/fixed-point-modifier.ts` | ゲームと同じ丸めで補正を掛ける |

```ts
if (!rollSecondaryEffect(0.3, battleContext)) return null;
const best = getHighestStat(ctx.attackerStats!, pokemon);
const boosted = modifyByFixedPoint(power, 5325);
```

## 6. 技フラグ表の追加方法

- 表: `src/modules/pokemon/domain/moves/move-flag-table.ts`
- フラグ: `contact` / `punch` / `bite` / `sound` / `pulse` / `ballistic` / `slicing` / `wind` / `powder` / `heal`
- 表は Pokemon Showdown（第9世代）の `flags` を、PokeAPI の技番号で日本語名（ja-Hrkt）に対応付けて作りました。
- 追加するときは `['<DBの技名>', ['contact', 'punch']], // <英語名>` を1行足します。技名は DB の name と完全に一致させます（例: `'ＤＤラリアット'` は全角）。
- 相手を対象にしない技は同じファイルの `NON_OPPONENT_TARGET_MOVE_NAMES` に足します。

## 7. 近似と注意

- 連続技・おやこあいでも、`onHit`（追加効果）と接触時の特性は1回だけです。
- `modifyBasePower` などの補正は順番に掛けます（ゲームは補正をまとめてから1回掛けるため、まれに1違うことがあります）。
- 行動順のコンテキストの `moveTypeName` は技本来のタイプです（うるおいボイスなどのタイプ変更は反映しません）。
- ほろびのうたは場全体の技なので、`isImmuneToMove` では止まりません。
- 混乱の自傷ダメージでは、特性のフック（`isImmuneToType`・`modifyBasePower`・`modifyAnyBasePower`・`modifyDamageDealt`・`modifyDamage`）を呼びません。本家と同じく、能力値とランクだけで決まります。
- ポケモンの重さのデータがないため、重さを使う効果（ヘヴィメタル、ライトメタル、けたぐり等）は実装できません。
