# バトルエンジンのフック一覧

技・特性の効果を実装するときに使うフックとコンテキストの一覧です。
この文書だけを見て実装できるように、呼ばれる場所と例を書いています。

- 特性のフック: `src/modules/pokemon/domain/abilities/ability-effect.interface.ts`（`IAbilityEffect`）
- 技のフック: `src/modules/pokemon/domain/moves/move-effect.interface.ts`（`IMoveEffect`）
- コンテキスト: `src/modules/pokemon/domain/abilities/battle-context.interface.ts`（`BattleContext`）
- イベントの型と補助関数: `src/modules/pokemon/domain/battle-events/`（ヒットの情報・原因・能力ランク・状態異常・技以外のダメージ・吸収・場の状態 `field-state.ts`・交代 `switching.ts`）

## 1. 技を使ったときの処理の順番

`MoveExecutorService.executeMove`（`src/modules/battle/application/services/move-executor.service.ts`）は、まず次の 3 段で技を出します（9 章）。

- 技を出す前の判定（`BeforeMoveChecker`）: 反動・ねむり・こおり・なまけ（`onBeforeMove`）・ひるみ（`onFlinch`）・技の制限・こんらん・メロメロ・まひ。止まったら PP も減らない
- 技を使う（`useMove`）: PP（プレッシャーの `modifyOpponentPpDeduction`）→ 技を出した記録（`lastMoveId` など）→ 技の `failsOnTryMove`（もえつきるなど）→ ゲンシ天候 → ふんじん（おおあめで消えたほのお技では爆発しない）→ みらいよちの予約 → よこどり → ため技の 1 ターン目（`chargeTurn`）→ 技の本体（下の 1〜13）→ 反動・出し続ける技（`lockedIn`）・じゅうでんの消去
- 相手の特性の `onOpponentMoveUsed`（おどりこ）

技の本体は次の順で処理します。

1. ヒット共通のコンテキストを作る（技名・技フラグ・効果のある天候・実数値・無視するランク・`effectivePriority`）
2. 両者の特性の `preventsMove` で技を失敗させるか判定する（変化技も含む。防御側はかたやぶりで無視）。失敗ならPPだけ減って `Used <技> but it failed (<特性名>)`。通ったら、使用者の特性の `onPrepareHit`（へんげんじざい・バトルスイッチなど。14.9）を呼び、使用者を読み直して技の本体をやり直す
3. 相手のまもる系（13.5）で防ぐかを判定する（相手を対象にする技だけ）。防いだら技の `onMiss`（とびひざげりなどの自傷）を呼び、`Used <技> but it was blocked (<守りの技名>)` で終わる。続けて、マジックコート・マジックミラー（13.6）ではね返すかを判定する
4. 防御側特性の `isImmuneToMove` で技そのものを無効にするか判定する（変化技も含む）。無効なら防御側特性の `onMoveBlocked` を呼んで終わり
5. 技の `shouldFail` で技が失敗するか判定する。失敗ならPPだけ減って `Used <技> but it failed`
6. 隠れている相手（そらをとぶなど）に届くかの判定と、命中判定（`AccuracyCalculator.checkHit`）。変化技も、相手を対象にする技なら命中判定をする（13.2）。当たったら、フェイントなど（`breaksProtect`）は相手の守りを解く（13.5）。相手のみがわりで、相手を対象にする変化技は失敗する
7. 変化技なら、まもる系の技（技の `protection`）の成功判定をしてから `onUse` を呼んで終わり（威力が null で `modifyMovePower` もない攻撃技も、今までどおりここで終わる）
8. 技のタイプを決める（技の `modifyMoveType` → 攻撃側特性の `modifyMoveType` → プラズマシャワー → そうでん。14.3）。技全体のタイプ相性を `moveTypeEffectiveness` に入れる。タイプ一致・相性には、両者の実効のタイプ（14.1）を使う
9. 技の `beforeDamage`（連続技の回数決定）。このあと攻撃側・防御側の状態を取り直す
10. 技の威力を決める（技の `modifyMovePower`）
11. ヒットごとに急所を引き（13.1）、ダメージを計算して当てる（連続技・おやこあいの追加ヒット。相手にみがわりがあればみがわりに当て、追加効果は起きない。こらえるの相手は HP が 1 残る。防御側特性の `blockDamagingHit`（ばけのかわなど。14.10）が防いだヒットは 0 にする）。1以上減らしたヒット（と防いだヒット）ごとに、防御側特性の `onDamagingHit` → 攻撃側特性の `onSourceDamagingHit` を呼ぶ。どちらも呼んだあとに両者の状態を取り直すので、`onSourceDamagingHit` には `onDamagingHit` で変わったあとの状態が渡る。ダメージ0・どちらかがひんしで止まる
12. 接触時の特性（`applyContactStatusCondition`）→ 技の `onHit` → 技の `afterDamage`（実際に減らしたHPの合計）
13. 防御側特性の `onAfterMoveHit`（合計ダメージが1以上のとき）→ 相手がひんしで自分が無事なら攻撃側特性の `onKnockOut` → 倒した相手のみちづれ・おんねん

メッセージは `Used <技> and dealt <ダメージ> damage (hit N times) <A critical hit!> <It broke through the protection!> <The opponent endured the hit!> <接触時の特性> <11のメッセージ> <onHit・afterDamage> <13のメッセージ>` の順に並びます。

ターン終了時（`StatusConditionProcessorService.processTurnEndAbilities`）は、すなあらし・ねがいごとのあと、場のポケモンごとに次の順で処理します（くわしくは `docs/battle-state.md` の 10 章）。

1. アクアリング・ねをはる・やどりぎのタネ（`VolatileResidualProcessor`）
2. ねむり: `shouldClearSleep(count, sleepTurnMultiplier)` で目を覚ますか判定する
3. どく・もうどく・やけど: ダメージを特性の `modifyStatusDamage` で変え、`applyIndirectDamage` で与える
4. あくむ・のろい・バインド・しおづけ・たこがため・あくび・ほろびのうた（`VolatileResidualProcessor`）
5. 特性の `onTurnEnd`（コンテキストに `trainedPokemonRepository` が入る）

その前に、`ExecuteTurnUseCase` がみらいよち（`executeFutureAttacks`）を当てます。

`DamageCalculator.calculate`（`src/modules/battle/domain/logic/damage-calculator.ts`）の中は次の順です。

1. タイプ一致・タイプ相性（攻撃側特性の `ignoresTypeImmunity` で相性0を等倍にできる。じゅうりょく・らんきりゅうも反映する）
2. 防御側特性の `isImmuneToType`（じゅうりょくの間は、ふゆうのじめん技の無効を無視する）
3. 威力補正（攻撃側特性の `modifyBasePower` → 場の特性の `modifyAnyBasePower` → じゅうでん → フィールド・どろあそび・みずあそび）
4. 能力値とランク（`attackStatOverride`、無視するランク、やけど半減。ワンダールームなら防御と特防の実数値を入れ替える）
5. 基本ダメージ（急所なら 1.5 倍で切り捨て。13.1）→ 攻撃側特性の `modifyDamageDealt` → 防御側特性の `modifyDamage` → 天候補正 → 隠れている相手への 2 倍 → 壁（リフレクター・ひかりのかべ・オーロラベール。急所には効かない）

## 2. 技のフック（IMoveEffect）

### modifyMovePower

- シグネチャ: `modifyMovePower?(attacker, defender, battleContext): number | undefined`
- 呼ばれる場所: `executeMove`。タイプ決定のあと、ダメージ計算の前に1回
- 使う技: たたりめ、ベノムショック、からげんき、アシストパワー、つけあがる、おしおき、ウェザーボール
- 戻り値は変更後の威力です。`battleContext.moveTypeName` は変更後のタイプ、`battleContext.weather` は効果のある天候です。
- 威力が null の攻撃技（DB の威力が null のおしおきなど）は、`modifyMovePower` を持たせるとダメージ技として扱われ、命中判定とダメージ計算をします。`undefined` を返して威力が決まらない場合は、ダメージを与えずに終わります。

```ts
modifyMovePower(_attacker: BattlePokemonStatus, defender: BattlePokemonStatus): number | undefined {
  const status = defender.statusCondition;
  const poisoned = status === StatusCondition.Poison || status === StatusCondition.BadPoison;
  return poisoned ? 130 : undefined;
}
```

- `StatusCondition` にはひるみ（`Flinch`）・こんらん（`Confusion`）も入っています（付与するときの名前としてだけ使い、`statusCondition` には入りません）。たたりめ・からげんきのように「状態異常なら」と判定するときは、`statusCondition !== None` ではなく `isMajorStatus(status)` を使います。ぜったいねむりも「ねむり」として扱う技（たたりめ・ゆめくい・ねごと・いびき・めざましビンタ）は、`getEffectiveStatusCondition(pokemon, ctx)` を使います（9 章）。

### modifyMoveType

- シグネチャ: `modifyMoveType?(attacker, defender, battleContext): string | undefined`
- 呼ばれる場所: `executeMove`。命中判定のあと、`beforeDamage` と攻撃側特性の `modifyMoveType` の前
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

### typeless（プロパティ）

- 型: `readonly typeless?: boolean`
- 参照する場所: `executeMove` の技タイプの決定。`true` なら、タイプ相性表にもポケモンのタイプにもないタイプで計算する（相性1倍・タイプ一致なし。混乱の自傷と同じタイプ）。技・特性の `modifyMoveType` は呼ばない
- 使う技: わるあがき（ゴーストタイプにも当たり、ふしぎなまもりも素通りする。本家と同じ）

### beforeDamage / afterDamage（呼ばれるようになった既存フック）

- `beforeDamage(attacker, defender, move, battleContext)`: 命中後、タイプ決定のあとに1回。`battleContext.multiHitCount` を2以上にすると、その回数だけダメージを与えます（`BaseMultiHitEffect` が使う）。
- `afterDamage(attacker, defender, damage, battleContext)`: `onHit` のあとに1回。`damage` は全ヒットで実際に減らしたHPの合計です（反動技など）。相手の残りHPを超えた分は入りません。

```ts
async beforeDamage(_a: BattlePokemonStatus, _d: BattlePokemonStatus, _m: Move, ctx: BattleContext) {
  ctx.multiHitCount = 2;
}
```

- `beforeDamage` のあと、エンジンは攻撃側・防御側を取り直してからダメージを計算します。シャドースチールのように、ダメージの前に相手のランクを奪う効果はここに書きます（相手のランクは直接書き込み、自分の上昇は `applyStatChanges` で行う）。
- `battleContext.moveTypeName` は決まったあとのタイプ、`battleContext.moveTypeEffectiveness` は技全体のタイプ相性です（攻撃側特性の `ignoresTypeImmunity` と防御側特性の `isImmuneToType` を反映）。シャドースチールは `moveTypeEffectiveness === 0`（ノーマルタイプの相手など）ならランクを奪いません（本家と同じ）。

### shouldFail

- シグネチャ: `shouldFail?(attacker, defender, battleContext): boolean | undefined`
- 呼ばれる場所: `executeMove`。特性の `preventsMove`・`isImmuneToMove` のあと、命中判定の前に1回。変化技でも呼ばれる
- 使う技: ゆめくい（相手がねむりでなければ失敗）
- `true` を返すとPPだけ減り、`Used <技> but it failed` になります。

```ts
shouldFail(_attacker: BattlePokemonStatus, defender: BattlePokemonStatus): boolean {
  return defender.statusCondition !== StatusCondition.Sleep;
}
```

- ゆめくいの回復は `afterDamage` で `applyDrainHeal(attacker, defender, calculateDrainAmount(damage, 0.5), ctx)` を呼びます（5章）。

### failsOnTryMove

- シグネチャ: `failsOnTryMove?(attacker, defender, battleContext): boolean | undefined`
- 呼ばれる場所: `useMove`。技を出した記録（PP・`lastMoveId`・`lastMoveTypeName`）のあと、ゲンシ天候・ふんじん・ため技・特性の `onPrepareHit`（14.9）より先に 1 回（本家の技の onTryMove）。呼ばれた技でも呼ばれる。みらいよちが当たるときは呼ばない
- `shouldFail` との違い: `shouldFail` は技の本体の中（まもる系・特性の無効化のあと）で呼ばれる。使用者の状態だけで決まる失敗で、へんげんじざい・リベロより先に判定したいもの（本家で onTryMove のもの）は `failsOnTryMove` に書く
- 使う技: もえつきる・でんこうそうげき（`ctx.attackerTypeNames` にほのお・でんきがなければ失敗）
- `true` を返すと `Used <技> but it failed` になります（PP は減っている）。

```ts
failsOnTryMove(_a: BattlePokemonStatus, _d: BattlePokemonStatus, ctx: BattleContext): boolean {
  return !(ctx.attackerTypeNames ?? []).includes('ほのお'); // もえつきる
}
```

## 3. 特性のフック（IAbilityEffect）

### modifyBasePower（攻撃側）

- シグネチャ: `modifyBasePower?(pokemon, power, battleContext): number | undefined`
- 呼ばれる場所: `DamageCalculator`。ダメージ計算式に入る前の威力に掛かる
- 使う特性: てつのこぶし、がんじょうあご、メガランチャー、かたいツメ、きれあじ、パンクロック（攻撃側）、アナライズ、テクニシャン
- `power` はヒットごとの威力です（技の `modifyMovePower` のあと。おやこあいの2回目も同じ威力）。威力で判定する特性（テクニシャンなど）は `battleContext.movePower` ではなくこの値を使います。
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
- 使う特性: うるおいボイス、-スキン系（フェアリースキンなど）、ノーマルスキン
- 返したタイプが、タイプ一致・タイプ相性・天候補正・ふんじん・ゲンシ天候の判定に使われる（ダメージ計算は、決まったタイプの ID を使う）。このあとプラズマシャワー・そうでんがタイプを変える（14.3）
- `battleContext.moveTypeName` は技の `modifyMoveType` のあとのタイプです。技本来のタイプは `battleContext.baseMoveTypeName` に入っています。-スキン系の1.2倍は、`modifyBasePower` で `baseMoveTypeName === 'ノーマル'` かつ `moveTypeName` が変わったかで判定します。

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
- 防御側の てんねん は `'defense'` も返します。ボディプレス（`attackStatOverride` が自分の防御）の防御ランクも無視するためです（本家は攻撃・防御・特攻・命中を無視する）。

```ts
ignoreOpponentRanks(_p: BattlePokemonStatus, role: 'attacker' | 'defender'): readonly StatType[] {
  return role === 'attacker'
    ? ['defense', 'specialDefense', 'evasion']
    : ['attack', 'defense', 'specialAttack', 'accuracy'];
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
- 使う特性: ぼうおん、ぼうだん、ぼうじん（粉技）、かぜのり（風技。攻撃技・変化技とも）
- `true` を返すと PP だけ減り、`Used <技> but it had no effect` になります。能力を上げるなどの副作用は `onMoveBlocked` に書きます（変化技にも使えます）。

```ts
isImmuneToMove(_p: BattlePokemonStatus, ctx?: BattleContext): boolean {
  return ctx?.moveFlags?.has('sound') === true;
}
```

### onMoveBlocked（防御側）

- シグネチャ: `onMoveBlocked?(pokemon, battleContext): Promise<string | null>`
- 呼ばれる場所: `executeMove`。`isImmuneToMove` が `true` を返し、PP を減らしたあとに1回
- 使う特性: かぜのり（風技を無効にして攻撃ランク+1）
- 戻り値のメッセージは `Used <技> but it had no effect` のあとに足されます。

```ts
async onMoveBlocked(pokemon: BattlePokemonStatus, ctx?: BattleContext): Promise<string | null> {
  if (!ctx?.battleRepository || pokemon.attackRank >= 6) return null;
  await ctx.battleRepository.updateBattlePokemonStatus(pokemon.id, { attackRank: pokemon.attackRank + 1 });
  return "'s Attack rose!";
}
```

### preventsMove（攻撃側・防御側）

- シグネチャ: `preventsMove?(holder, role: 'attacker' | 'defender', battleContext): boolean | undefined`
- 呼ばれる場所: `executeMove`。コンテキストを作った直後、`isImmuneToMove` と命中判定の前。攻撃側特性（`role = 'attacker'`）→ 防御側特性（`role = 'defender'`）の順。変化技・自分を対象にする技を含むすべての技で呼ばれる。防御側はかたやぶりで無視される
- 使う特性: しめりけ（両方の役割で、だいばくはつ・じばく・ビックリヘッド・ミストバーストを止める）、じょおうのいげん・ビビッドボディ・テイルアーマー（防御側で、相手の優先度が1以上の技を止める）
- 優先度は `battleContext.effectivePriority`（いたずらごころなどの `modifyPriority` を反映した値）を使います。自分を対象にする技（まもるなど）は止めないので、`MoveFlags.targetsOpponent(ctx.moveName)` も確かめます。

```ts
preventsMove(_h: BattlePokemonStatus, role: 'attacker' | 'defender', ctx?: BattleContext): boolean {
  return role === 'defender' && (ctx?.effectivePriority ?? 0) > 0 && MoveFlags.targetsOpponent(ctx?.moveName ?? '');
}
```

- おうごんのからだ（相手の変化技を無効）は `isImmuneToMove` で `ctx?.moveCategory === 'Status'` を返せば作れます（相手を対象にする技だけで呼ばれ、命中判定の前）。

### onDamagingHit（防御側、ヒットごと）

- シグネチャ: `onDamagingHit?(holder, attacker, hit: HitResult, battleContext): Promise<string | null>`
- 呼ばれる場所: `executeMove`。1以上のダメージを受けたヒットのたびに、HPを減らした直後。ひんしになったヒットでも呼ばれる（`hit.targetFainted === true`）。かたやぶりでは無視されない
- 使う特性: じきゅうりょく、せいぎのこころ、びびり、みずがため、じょうききかん、ねつこうかん（攻撃+1の部分）、わたげ、すなはき、こぼれダネ、とびだすなかみ（ひんしになったとき）、さめはだ・てつのトゲ・ゆうばく（`BaseContactRecoilDamageEffect`）
- `holder` はダメージを反映した状態です。ここで変えたランクは次のヒットのダメージ計算に使われます。
- てつのトゲ・さめはだ・ゆうばくは `BaseContactRecoilDamageEffect` を継承して作ります。この基底クラスがここで `hit.isContact` を見て、接触したヒットごとに攻撃側へダメージを与えます（本家と同じ）。`applyContactStatusCondition` にも書くと、攻撃側が2回ダメージを受けます。
- 本家で「かたやぶりで止まる」特性（ねつこうかんなど）は、`await isIgnoredByMoldBreaker(ctx.attackerAbilityName, 'ねつこうかん')`（`pokemon/domain/battle-events/ability-lookup` から import）で自分で判定します。特性のファイルから `AbilityRegistry` を import すると循環参照になるため、使いません。

```ts
async onDamagingHit(holder: BattlePokemonStatus, _a: BattlePokemonStatus, hit: HitResult, ctx?: BattleContext) {
  if (hit.moveTypeName !== 'あく' || !ctx) return null;
  const result = await applyStatChanges(holder, [{ statType: 'attack', rankChange: 1 }], ctx, { source: { pokemon: holder, kind: 'ability', name: 'せいぎのこころ' } });
  return joinStatChangeMessages(result);
}
```

### onSourceDamagingHit（攻撃側、ヒットごと）

- シグネチャ: `onSourceDamagingHit?(holder, target, hit: HitResult, battleContext): Promise<string | null>`
- 呼ばれる場所: `executeMove`。防御側の `onDamagingHit` のすぐあと
- 使う特性: どくしゅ（接触技で30%どく）、どくのくさり（30%もうどく）、あくしゅう（10%ひるみ）
- 本家ではりんぷんで止まります。`rollSecondaryEffect(0.3, ctx)` を使えば `secondaryEffectsSuppressed` を見ます（てんのめぐみの倍率も掛かる点に注意。どくしゅ・どくのくさりは本家ではてんのめぐみの対象外なので、`ctx.secondaryEffectsSuppressed` を見て `Math.random()` で判定する）。

```ts
async onSourceDamagingHit(holder: BattlePokemonStatus, target: BattlePokemonStatus, hit: HitResult, ctx?: BattleContext) {
  if (!ctx || !hit.isContact || ctx.secondaryEffectsSuppressed || Math.random() >= 0.3) return null;
  const { inflicted } = await tryInflictStatus(target, StatusCondition.Poison, ctx, { source: { pokemon: holder, kind: 'ability', name: 'どくしゅ' } });
  return inflicted ? 'was poisoned!' : null;
}
```

### onAfterMoveHit（防御側、技全体で1回）

- シグネチャ: `onAfterMoveHit?(holder, attacker, hit: HitResult, battleContext): Promise<string | null>`
- 呼ばれる場所: `executeMove`。技の `afterDamage` のあと、合計ダメージが1以上のとき1回。`hit.damage` は合計、`hit.hpBefore` は技を受ける前のHP。かたやぶりでは無視されない
- 使う特性: いかりのこうら、ぎゃくじょう（連続技でも、技のあとに1回だけ判定する。本家と同じ）

```ts
async onAfterMoveHit(holder: BattlePokemonStatus, _a: BattlePokemonStatus, hit: HitResult) {
  const half = holder.maxHp / 2;
  if (holder.currentHp <= 0 || !(hit.hpBefore > half && holder.currentHp <= half)) return null;
  return 'Anger Shell activated!';
}
```

### onKnockOut（攻撃側）

- シグネチャ: `onKnockOut?(holder, fainted, battleContext): Promise<string | null>`
- 呼ばれる場所: `executeMove`。技の処理がすべて終わったあと（`onAfterMoveHit` のあと）、相手がひんしで自分がひんしでないとき
- 使う特性: じしんかじょう、しろのいななき、くろのいななき、ビーストブースト、ソウルハート（近似。7章）
- ビーストブーストの「最も高い能力」は、ランク補正前の実数値 `ctx.attackerStats` から選びます（本家と同じ）。

```ts
async onKnockOut(holder: BattlePokemonStatus, _fainted: BattlePokemonStatus, ctx?: BattleContext) {
  if (!ctx) return null;
  return joinStatChangeMessages(await applyStatChanges(holder, [{ statType: 'attack', rankChange: 1 }], ctx, { source: { pokemon: holder, kind: 'ability', name: 'じしんかじょう' } }));
}
```

### applyContactStatusCondition（防御側、技全体で1回）

- シグネチャ: `applyContactStatusCondition?(defender, attacker, battleContext): Promise<boolean>`
- 呼ばれる場所: `executeMove`。ヒットのループのあと、合計ダメージが1以上のとき1回（以前は duck typing だった。今はインターフェースに定義済み）。`true` を返すと `<特性名> activated!` が付く
- 使う特性: 既存の基底クラス `BaseContactStatusConditionEffect`（せいでんきなど）、`BaseContactStatChangeEffect`（ぬめぬめなど）
- 注: 本家のせいでんき・ぬめぬめなどはヒットごとに判定しますが、ここでは連続技でも技全体で1回です。
- てつのトゲ・さめはだ・ゆうばくはこのフックを使いません（`onDamagingHit` でヒットごとに与える）。

```ts
export class IronBarbsEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
  protected readonly abilityName = 'てつのトゲ';
}
```

### 状態異常のフック

| フック | シグネチャ | 呼ばれる場所 | 使う特性 |
| --- | --- | --- | --- |
| `canReceiveStatusCondition`（既存） | `(pokemon, status, ctx?, source?: EffectSource) => boolean \| undefined` | `canInflictStatus`。技で付与するときはかたやぶりで無視 | めんえき、じゅうなん など。`source` が入るようになった |
| `bypassesStatusTypeImmunity` | `(holder, status, ctx?) => boolean \| undefined` | `canInflictStatus`。対象がタイプで防ぐとき、付与元の特性として | ふしょく |
| `onStatusInflicted` | `(holder, status, source: EffectSource \| undefined, ctx?) => Promise<string \| null>` | `inflictStatus`。書き込んだあと、付与された側の特性として | シンクロ |
| `onInflictStatus` | `(holder, target, status, ctx?) => Promise<string \| null>` | `inflictStatus`。書き込んだあと、付与元の特性として（自分に付与したときは呼ばない） | どくくぐつ |
| `modifyStatusDamage` | `(holder, status, damage, ctx?) => number \| undefined \| Promise<number \| undefined>` | ターン終了時、どく・もうどく・やけどのダメージの前 | ポイズンヒール（回復して0を返す）、たいねつ（やけどを半分） |

```ts
bypassesStatusTypeImmunity(_h: BattlePokemonStatus, status: StatusCondition): boolean {
  return status === StatusCondition.Poison || status === StatusCondition.BadPoison;
}
```

```ts
async onStatusInflicted(holder: BattlePokemonStatus, status: StatusCondition, source: EffectSource | undefined, ctx?: BattleContext) {
  if (!ctx || !source?.pokemon || source.pokemon.id === holder.id || ![StatusCondition.Burn, StatusCondition.Paralysis, StatusCondition.Poison, StatusCondition.BadPoison].includes(status)) return null;
  const { inflicted } = await tryInflictStatus(source.pokemon, status, ctx, { source: { pokemon: holder, kind: 'ability', name: 'シンクロ' } });
  return inflicted ? 'Synchronize activated!' : null;
}
```

```ts
async modifyStatusDamage(holder: BattlePokemonStatus, status: StatusCondition, _damage: number, ctx?: BattleContext) {
  if (status !== StatusCondition.Poison && status !== StatusCondition.BadPoison) return undefined;
  await ctx?.battleRepository?.updateBattlePokemonStatus(holder.id, { currentHp: Math.min(holder.maxHp, holder.currentHp + Math.max(1, Math.floor(holder.maxHp / 8))) });
  return 0;
}
```

- シンクロの `source.pokemon` は付与したときの状態です。最新の状態が必要なら `ctx.battleRepository.findBattlePokemonStatusById(source.pokemon.id)` で取り直します。

### 能力ランクのフック

| フック | シグネチャ | 呼ばれる場所 | 使う特性 |
| --- | --- | --- | --- |
| `modifyIncomingStatChange` | `(holder, change: StatChange, source: EffectSource \| undefined, ctx?) => number \| undefined` | `applyStatChanges`。自分のランクが変わるたび（自分で起こした変化も含む）。相手の技による変化ではかたやぶりで無視 | たんじゅん（×2）、あまのじゃく（×-1）、ばんけん（いかくの攻撃-1を+1に） |
| `canReceiveStatChange`（既存） | `(pokemon, statType, rankChange, ctx?, source?: EffectSource) => boolean \| undefined` | `applyStatChanges`。相手が起こした低下だけ。相手の技ではかたやぶりで無視 | クリアボディ など。`source` が入るようになった |
| `onStatChanged` | `(holder, applied: readonly StatChange[], source, ctx?) => Promise<string \| null>` | `applyStatChanges`。自分のランクを書き込んだあと（実際に変わったときだけ） | びびり（`source?.name === 'いかく'` で素早さ+1）、まけんき・かちき（作り直す場合） |
| `onOpponentStatChanged` | `(holder, opponent, applied, source, ctx?) => Promise<string \| null>` | `applyStatChanges`。相手のランクを書き込んだあと、相手の `onStatChanged` のあと | びんじょう |

```ts
modifyIncomingStatChange(_h: BattlePokemonStatus, change: StatChange, source?: EffectSource): number | undefined {
  return source?.name === 'いかく' && change.statType === 'attack' && change.rankChange < 0 ? 1 : undefined;
}
```

```ts
async onOpponentStatChanged(holder: BattlePokemonStatus, _o: BattlePokemonStatus, applied: readonly StatChange[], source: EffectSource | undefined, ctx?: BattleContext) {
  const ups = applied.filter(c => c.rankChange > 0);
  if (!ctx || ups.length === 0 || source?.name === 'びんじょう') return null;
  return joinStatChangeMessages(await applyStatChanges(holder, ups, ctx, { source: { pokemon: holder, kind: 'ability', name: 'びんじょう' } }));
}
```

### isImmuneToType（既存。コンテキストが増えた）

- 呼ばれる場所: `DamageCalculator`。`battleContext.typeEffectiveness` と `moveFlags` が入るようになりました。混乱の自傷では呼ばれません
- 使う特性: ふしぎなまもり（効果抜群以外を無効）。ぼうだん・かぜのりは攻撃技も `isImmuneToMove` で止めるので、ここには書きません

```ts
isImmuneToType(_p: BattlePokemonStatus, _type: string, ctx?: BattleContext): boolean {
  return (ctx?.typeEffectiveness ?? 1) <= 1;
}
```

### modifyMultiHitCount（攻撃側）

- シグネチャ: `modifyMultiHitCount?(pokemon, minHits, maxHits, battleContext): number | undefined`
- 呼ばれる場所: `BaseMultiHitEffect.beforeDamage`
- 使う特性: スキルリンク
- 連続技は `MoveRegistry` に登録済みです（2〜5回は `TwoToFiveHitEffect`、2回は `TwoHitEffect` など）。登録した回数は `move-registry.multi-hit.spec.ts` で本家の表と照合しています。

```ts
modifyMultiHitCount(_p: BattlePokemonStatus, _min: number, max: number): number {
  return max;
}
```

### getAdditionalHitDamageRatios（攻撃側）

- シグネチャ: `getAdditionalHitDamageRatios?(pokemon, battleContext): readonly number[] | undefined`
- 呼ばれる場所: `executeMove`。連続技ではない攻撃技のときだけ
- 使う特性: おやこあい（`[0.25]`）。追加ヒットの威力は1回目と同じで、`DamageCalculator` が基礎ダメージ（ダメージ式の +2 のあと）に `modifyByFixedPoint(baseDamage, 0.25, 1)` で倍率を掛けます（本家の `modifyDamage` と同じ。`DamageCalculationParams.baseDamageRatio`）。
- 注: `onHit`（追加効果）と `applyContactStatusCondition` の特性（せいでんきなど）は、ヒット数にかかわらず1回だけです。さめはだなど `onDamagingHit` の特性はヒットごとです。

```ts
getAdditionalHitDamageRatios(_p: BattlePokemonStatus, ctx?: BattleContext): readonly number[] | undefined {
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
| `preventsRecoil` | `boolean` | `BaseRecoilEffect.afterDamage`（攻撃側） | いしあたま、マジックガード（与えたダメージに応じた反動だけ。とびげりの自傷・わるあがきは防がない） |
| `preventsIndirectDamage` | `boolean` | `applyIndirectDamage` / `isIndirectDamagePrevented`（かたやぶりで無視されない） | マジックガード（どく・やけど・反動・外したときの自傷・わるあがき・さめはだ・ナイトメア・ヘドロえきを防ぐ。混乱の自傷は防がない） |
| `reversesDrainHeal` | `boolean` | `applyDrainHeal`（吸い取られた側。かたやぶりで無視されない） | ヘドロえき |
| `reflectsStatDrops` | `boolean` | `applyStatChanges`（相手が起こした低下。相手の技ではかたやぶりで無視） | ミラーアーマー |
| `sleepTurnMultiplier` | `number` | ターン終了時のねむりの解除判定（`shouldClearSleep` の `step`） | はやおき（`2`） |

テラボルテージ・ターボブレイズは `MoldBreakerEffect` をそのまま登録します。

```ts
this.registry.set('テラボルテージ', new MoldBreakerEffect());
export class CloudNineEffect implements IAbilityEffect { readonly suppressesWeather = true; }
export class SereneGraceEffect implements IAbilityEffect { readonly secondaryEffectChanceMultiplier = 2; }
export class EarlyBirdEffect implements IAbilityEffect { readonly sleepTurnMultiplier = 2; }
```

- マジックガードは今の `MagicGuardEffect` に `readonly preventsIndirectDamage = true;` を足します（`preventsRecoil` は残してよい）。いしあたまは `preventsRecoil` だけで本家どおりです（とびげりの自傷とわるあがきの反動は受ける）。

## 4. コンテキストの項目（BattleContext）

| 項目 | 内容 | 入る場所 |
| --- | --- | --- |
| `moveName` | 技名（DB の name） | 技の実行・行動順 |
| `moveFlags` | 技フラグ。技の実行・ダメージ計算では `modifyMoveFlags` の反映後、行動順では技フラグ表のまま | 技の実行・行動順・ダメージ計算 |
| `moveTypeName` | 技のタイプ名（タイプ変更の反映後） | 技の実行・行動順・ダメージ計算 |
| `moveCategory` | 技の分類（`'Physical'` / `'Special'` / `'Status'`） | 技の実行・行動順・ダメージ計算 |
| `baseMoveTypeName` | 技本来のタイプ名（タイプ変更の前） | 技の実行・ダメージ計算 |
| `movePower` | 技の威力（`modifyMovePower` の反映後、特性補正の前） | 技の実行・ダメージ計算 |
| `movePriority` | 技の優先度（特性補正の前） | 技の実行・行動順 |
| `effectivePriority` | 攻撃側特性の `modifyPriority`（いたずらごころなど）を反映した優先度 | 技の実行（`preventsMove` 以降） |
| `attackerAbilityName` / `defenderAbilityName` | 攻撃側・防御側の実効の特性名（特性の上書き・いえき・かがくへんかガスを反映。14.1）。効いていなければ undefined | 技の実行・行動順・ダメージ計算 |
| `attackerTypeNames` / `defenderTypeNames` | 攻撃側・防御側の実効のタイプ名（14.1） | 技の実行 |
| `typeEffectivenessRepository` | タイプ相性表のリポジトリ（`findResistingTypeNames` が使う。14.2） | 技の実行 |
| `attacker` / `defender` | 攻撃側・防御側の最新の状態（ランク・HP・状態異常） | 技の実行・ダメージ計算。行動順では `attacker` が行動するポケモン |
| `attackerStats` / `defenderStats` | ランク補正前の実数値 | 技の実行・ダメージ計算。行動順では `attackerStats` が行動するポケモン |
| `typeEffectiveness` | このヒットのタイプ相性（0〜4） | ダメージ計算中の特性フック |
| `isCriticalHit` | このヒットが急所か（13.1。ヒットのループのあとは最後のヒットの値） | ダメージ計算中の特性フック・攻撃技の `onHit` 以降 |
| `moveTypeEffectiveness` | 技全体のタイプ相性（0〜4）。防御側特性の `isImmuneToType` で無効なら0 | ダメージ技の `beforeDamage` 以降 |
| `weather` | 効果のある天候（ノーてんき等がいれば `None`） | 技の実行・行動順・ターン終了時・ダメージ計算 |
| `isLastToMove` | このターン最後に行動するか | 技の実行・ダメージ計算 |
| `hasRecoil` | 反動・外したときの自傷がある技か（技の `hasRecoil`） | 技の実行・ダメージ計算 |
| `multiHitCount` / `hitIndex` | 総ヒット数 / 何回目のヒットか（0始まり） | 技の実行・ダメージ計算 |
| `ignoredAttackerRanks` / `ignoredDefenderRanks` | 0として扱うランク | 技の実行・命中判定・ダメージ計算 |
| `secondaryEffectChanceMultiplier` / `secondaryEffectsSuppressed` | 追加効果の確率倍率 / 相手への追加効果の無効化 | ダメージ技の `beforeDamage` 以降・`onHit` |
| `moveId` | 技の ID（Move の ID） | 技の実行・ダメージ計算 |
| `defenderPendingMoveId` | 相手がこのターンにまだ技を出していなければ、出す予定の技の ID（9.4） | 技の実行 |
| `callMove` / `calledBy` | 別の技を出す関数 / 呼ばれた技のときの、呼んだ技・特性の名前（9.4） | 技の実行・`onOpponentMoveUsed` |
| `attackerEffectiveStatus` / `defenderEffectiveStatus` | 状態異常として扱う状態（ぜったいねむりならねむり。9.1） | 技の実行 |
| `hitSubstitute` | 技がみがわりに当たった（`afterDamage` の `damage` はみがわりに与えた量） | 技の実行の `afterDamage` |
| `moveRepository` | 技のリポジトリ（9.4） | 技の実行 |
| `selfSwitchCancelled` | 技の効果が `true` にすると、技の `selfSwitch` の交代をやめる（11.5） | 技の実行（`onUse`・`onHit`・`afterDamage` で書く） |
| `attackerFaintedAllyCount` | 攻撃側の手持ちがひんしになった延べ数（自分が復活した回数も入る。11.7） | ダメージ技の実行・ダメージ計算 |

### イベントの型（`pokemon/domain/battle-events/`）

| 型 | 項目 | 渡す場所 |
| --- | --- | --- |
| `HitResult`（`hit-result.ts`） | `damage`（実際に減らしたHP）、`hpBefore`（受ける前のHP）、`hitIndex`、`hitCount`、`isContact`、`moveTypeName`、`moveCategory`、`targetFainted` | `onDamagingHit`・`onSourceDamagingHit`（ヒットごと）、`onAfterMoveHit`（技全体: `damage` は合計、`hpBefore` は技の前） |
| `EffectSource`（`effect-source.ts`） | `pokemon`（起こしたポケモン。自分で起こしたら対象と同じ）、`abilityName`（そのポケモンの特性名）、`kind`（`'move'` / `'ability'` / `'other'`）、`name`（技名・特性名。例: `'いかく'`） | 状態異常と能力ランクのフックすべて。`kind === 'move'` で相手が起こしたときだけ、対象の特性がかたやぶりで無視される |
| `StatChange`（`stat-change.ts`） | `statType`、`rankChange` | 能力ランクのフック |
| `StatChangeResult`（`stat-change.ts`） | `applied`（実際に変わった量）、`reflected`（ミラーアーマーで返した量）、`messages`（反応した特性のメッセージ。ミラーアーマーで返したときは `<特性名> reflected the stat drop!` と相手のランクの変化（例: `Accuracy fell!`）も入る） | `applyStatChanges` の戻り値 |

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
| `isMajorStatus(status)` | `battle/domain/logic/major-status.ts` | 状態異常か（ひるみ・こんらんを除く。たたりめ、からげんき） |
| `modifyByFixedPoint(value, numerator, denominator = 4096)` | `battle/domain/logic/fixed-point-modifier.ts` | ゲームと同じ丸めで補正を掛ける |

```ts
if (!rollSecondaryEffect(0.3, battleContext)) return null;
const best = getHighestStat(ctx.attackerStats!, pokemon);
const boosted = modifyByFixedPoint(power, 5325);
```

### バトルイベントの補助関数（`pokemon/domain/battle-events/`）

能力ランク・状態異常・技以外のダメージ・吸収の回復は、必ずこれらを使います。直接 `updateBattlePokemonStatus` で書くと、特性のフックが呼ばれません。どれも引数のポケモンは最新の状態を渡します（中で取り直しません）。

| 関数 | 場所 | 用途 |
| --- | --- | --- |
| `applyStatChanges(target, changes, ctx, { source?, reflected? })` | `stat-change.ts` | 能力ランクを変える。`modifyIncomingStatChange` → `reflectsStatDrops` / `canReceiveStatChange`（相手が起こした低下） → ±6 に収めて書き込む → `onStatChanged` → 相手の `onOpponentStatChanged`。ランクが変わらなければ書き込まない |
| `joinStatChangeMessages(result)` / `moveEffectSource(attacker, ctx)` | `moves/effects/base/base-stat-change-effect.ts` | `"Attack rose!"` 形式のメッセージを作る / 技が起こした変化の `EffectSource` を作る |
| `canInflictStatus(target, status, ctx, { source?, immuneTypes? })` | `status-infliction.ts` | 状態異常を付与できるか（ひんし・状態異常済み・タイプ免疫・対象の `canReceiveStatusCondition`）。書き込まない。タイプ免疫のうち `STATUS_IMMUNE_TYPES` の分だけ付与元の `bypassesStatusTypeImmunity` で無視でき、`immuneTypes` で足した分（粉技のくさ、でんじはのじめん）は無視できない |
| `inflictStatus(target, status, ctx, options)` | 同上 | 書き込み、`onStatusInflicted`（対象）と `onInflictStatus`（付与元）を呼ぶ。メッセージの配列を返す |
| `tryInflictStatus(target, status, ctx, options)` | 同上 | 上の2つをまとめたもの。`{ inflicted, messages }` を返す。確率で付与する効果は `canInflictStatus` → 確率判定 → `inflictStatus` の順にする |
| `STATUS_IMMUNE_TYPES` | 同上 | 状態異常ごとの免疫タイプ（どく・もうどく: どく/はがね、やけど: ほのお、まひ: でんき、こおり: こおり） |
| `applyIndirectDamage(target, amount, ctx)` / `isIndirectDamagePrevented(target, ctx)` | `indirect-damage.ts` | 技以外のダメージを与える（マジックガードなら0）。実際に減らしたHPを返す |
| `calculateDrainAmount(damage, ratio)` / `applyDrainHeal(healer, drainedFrom, amount, ctx)` | `drain-heal.ts` | 吸収の回復量（四捨五入、最低1）/ 回復する（ヘドロえきなら同じ量の技以外のダメージ）。`{ healed, damaged }` を返す |
| `resolveAbilityName(pokemon, ctx)` / `getAbilityEffect(name)` | `ability-lookup.ts` | ポケモンの実効の特性名（14.1）・特性の効果を引く（特性のファイルから使っても循環参照にならない） |
| `resolveTypeNames(pokemon, ctx)` / `hasType(pokemon, typeName, ctx)` | `battle-traits.ts` | ポケモンの実効のタイプ（14.1）。`TrainedPokemon` のタイプを直接読まない |

```ts
const result = await applyStatChanges(target, [{ statType: 'speed', rankChange: -1 }], ctx, { source: { pokemon: holder, kind: 'ability', name: 'わたげ' } });
const { inflicted } = await tryInflictStatus(target, StatusCondition.BadPoison, ctx, { source: moveEffectSource(attacker, ctx) });
const healed = await applyDrainHeal(attacker, defender, calculateDrainAmount(damage, 0.5), ctx);
```

- `BaseStatusConditionEffect` は、変化技（どくどく・でんじは・おにびなど）では `onUse`、ダメージ技の追加効果では `onHit` で付与します。変化技の状態異常は追加効果ではないので、確率判定をせず、りんぷんでも防がれません。
- 既存の基底クラスは乗せ換え済みです: 能力ランクは `BaseStatChangeEffect`・`BaseOpponentStatChangeMoveEffect`・`BaseSelfStatChangeMoveEffect`・`BaseSelfMultiStatChangeMoveEffect`・`BaseOpponentMultiStatChangeMoveEffect`・`BaseSelfAllStatsBoostEffect`・`BaseOpponentStatChangeEffect`（いかくなど）・`BaseStatBoostEffect`・`BaseContactStatChangeEffect`。状態異常は `BaseStatusConditionEffect`・`BaseMultipleStatusConditionEffect`・`BaseContactStatusConditionEffect`。技以外のダメージはターン終了時の状態異常・`BaseRecoilEffect`・`applyMaxHpSelfDamage`（とびげり・わるあがき）・`BaseContactRecoilDamageEffect`・ナイトメア。

## 6. 技フラグ表の追加方法

- 表: `src/modules/pokemon/domain/moves/move-flag-table.ts`
- フラグ: `contact` / `punch` / `bite` / `sound` / `pulse` / `ballistic` / `slicing` / `wind` / `powder` / `heal`
- 表は Pokemon Showdown（第9世代）の `flags` を、PokeAPI の技番号で日本語名（ja-Hrkt）に対応付けて作りました。
- 追加するときは `['<DBの技名>', ['contact', 'punch']], // <英語名>` を1行足します。技名は DB の name と完全に一致させます（例: `'ＤＤラリアット'` は全角）。
- 相手を対象にしない技は同じファイルの `NON_OPPONENT_TARGET_MOVE_NAMES` に足します。

## 7. 近似と注意

- 連続技・おやこあいでも、`onHit`（追加効果）と `applyContactStatusCondition` の接触時の特性（せいでんきなど）は1回だけです。
- `modifyBasePower` などの補正は順番に掛けます（ゲームは補正をまとめてから1回掛けるため、まれに1違うことがあります）。
- 行動順のコンテキストの `moveTypeName` は技本来のタイプです（うるおいボイスなどのタイプ変更は反映しません）。
- ほろびのうたは場全体の技なので、`isImmuneToMove` では止まりません。
- 混乱の自傷ダメージでは、特性のフック（`isImmuneToType`・`modifyBasePower`・`modifyAnyBasePower`・`modifyDamageDealt`・`modifyDamage`）を呼びません。本家と同じく、能力値とランクだけで決まります。
- ポケモンの重さのデータがないため、重さを使う効果（ヘヴィメタル、ライトメタル、けたぐり等）は実装できません。
- `onDamagingHit` / `onSourceDamagingHit` はヒットごとですが、`applyContactStatusCondition` と技の `onHit` は今までどおり技全体で1回です。
- `onDamagingHit` / `onSourceDamagingHit` は、技の `onHit`（追加効果）より先に呼ばれます。本家（Showdown の `spreadMoveHit`）は追加効果のあとに `DamagingHit` を呼びます。そのため、どくしゅの使い手が状態異常の追加効果を持つ接触技（ほっぺすりすりなど）を使うと、ここでは先にどくしゅが判定され、技自身の状態異常が失敗することがあります（本家は技の状態異常が先）。
- 特性や技が書き換えた天候・フィールド（すなはき・こぼれダネ・あまごいなど）は、その技の残りのヒット・同じターンの相手の技・ターン終了時の処理には反映されません。`execute-turn` がターンの初めに読んだ `battle` を使い続けるためです。次のターンから反映されます。
- 場に出たときの特性（`onEntry`）はメッセージを返せません。いかくで発動したびびりの「Speed rose!」や、ノーてんき・エアロックの登場時のメッセージは出ません。
- ひるみ・こんらんは volatileState に入るので、状態異常と同時に持てます（`docs/battle-state.md` の 8 章）。
- 次の効果は `applyStatChanges` を通らず、ランクを直接書きます。たんじゅん・あまのじゃく・ミラーアーマー・びんじょうなどは効きません: はらだいこ、はいすいのじん、ソウルビート、みをけずる、つぼをつく、ナインエボルブースト、ブレイブチャージ、ほおばる、じばそうさ・ギアアップ（`BasePlusMinusSelfStatBoostEffect`）、たがやす・フラワーガード（`BaseGrassTypeStatBoostEffect`）、いばる・おだてる（`BaseConfuseWithStatBoostEffect`）、おきみやげ、どくのいと、ひっくりかえす、くろいきり・クリアスモッグ、じこあんじ、ガードスワップなどの入れ替え技、かそく・ムラっけ・まけんき・かちき・そうしょく・でんきエンジン・ひらいしん・よびみず・こんがりボディ（`BaseTypeImmunityWithStatBoostEffect`）・こんじょう（`kongyou-effect.ts` の `GutsHpThresholdEffect`）などの既存の特性。必要になったら `applyStatChanges` に乗せ換えます。
- トライアタック（`TriAttackEffect`）・どくのいと（`ToxicThreadEffect`）・サイコシフト（`PsychoShiftEffect`）は `canInflictStatus` / `inflictStatus` に乗せ換え済みです（シンクロ・ふしょく・`onInflictStatus` などが効く）。サイコシフトは相手に移してから使用者を治すので、相手がシンクロでもうつし返されません（本家と同じ）。
- 接触時の特性（せいでんき・ほのおのからだ・どくのトゲなど、`BaseContactStatusConditionEffect`）で状態異常にされたときもシンクロは発動しますが、`applyContactStatusCondition` は `boolean` しか返せないため、`inflictStatus` のメッセージは捨てています。バトルログには `<特性名> activated!` だけが出て、シンクロで相手も状態異常になったことは表示されません。
- `onOpponentStatChanged`（びんじょう）の「相手」は、相手が起こした変化ならその相手、技の実行中ならコンテキストの `attacker` / `defender` です。場に出たとき・ターン終了時に相手が自分で上げた変化（ふとうのつるぎなど）では呼ばれません。また本家は行動の終わりにまとめて写しますが、ここではすぐに写します。
- `onKnockOut` は「自分の技で相手をひんしにした」ときだけです。ソウルハートは本家では誰がひんしになっても発動しますが、ここでは自分の技で倒したときだけになります（反動・状態異常・さめはだで相手が倒れたときは発動しない）。
- 場に出たときの特性のコンテキスト（バトル開始時・交代時）には `trainedPokemonRepository` が入ります。いかくに対するクリアボディ・ばんけん・ミラーアーマーなどはこれで判定します。

### まだ作れない効果

| 効果 | 足りないもの |
| --- | --- |
| ヘヴィメタル、ライトメタル | ポケモンの重さのデータがない |
| かぜのりの「おいかぜで攻撃+1」 | おいかぜを張ったときに呼ばれるフックがない（おいかぜの技の `onUse` で、場の自分のポケモンのかぜのりを見て `applyStatChanges` する）。風技を無効にして攻撃+1にする部分は `isImmuneToMove` + `onMoveBlocked` で作れる |
| こだいかっせい・クォークチャージの「ブーストエナジー」 | 持ち物の仕組みがない。晴れ・エレキフィールドで発動する部分は作れる |
| じんばいったい（ブリザポス） | きんちょうかん（相手がきのみを食べられない）に持ち物の仕組みがない。しろのいななきの部分は `onKnockOut` で作れる |
| ゆき（さむいギャグ・ゆきふらし・ゆきげしき） | `Weather` enum に `Snow` がない（マイグレーションが要る）。今は `Hail` で代わりにする |

## 8. 特性・技ごとに使うフック

| 特性・技 | 使うもの |
| --- | --- |
| ゆめくい | 技の `shouldFail` + `afterDamage` で `applyDrainHeal(attacker, defender, calculateDrainAmount(damage, 0.5), ctx)` |
| シャドースチール | 技の `beforeDamage`（`ctx.moveTypeEffectiveness === 0` なら何もしない。相手のプラスのランクを0にし、自分は `applyStatChanges`）。このあとエンジンが状態を取り直す |
| あくしゅう | `onSourceDamagingHit` + `rollSecondaryEffect(0.1, ctx)` + `tryInflictStatus(target, Flinch, ...)` |
| どくしゅ・どくのくさり | `onSourceDamagingHit` + `tryInflictStatus`（どくしゅは `hit.isContact` のときだけ） |
| しめりけ | `preventsMove`（両方の役割で、技名が だいばくはつ・じばく・ビックリヘッド・ミストバースト なら true） |
| じょおうのいげん・ビビッドボディ・テイルアーマー | `preventsMove`（`role === 'defender'`、`effectivePriority > 0`、相手を対象にする技） |
| おうごんのからだ | `isImmuneToMove`（`moveCategory === 'Status'`） |
| シンクロ | `onStatusInflicted` + `tryInflictStatus(source.pokemon, ...)`（やけど・まひ・どく・もうどくだけ。どくびし `{ kind: 'other', name: 'どくびし' }` では発動しない） |
| ふしょく | `bypassesStatusTypeImmunity`（どく・もうどく） |
| どくくぐつ | `onInflictStatus` で、どく・もうどくにした相手に `tryInflictStatus(target, StatusCondition.Confusion, ...)`（こんらんは状態異常と同時に持てる） |
| はやおき | `sleepTurnMultiplier = 2` |
| ポイズンヒール | `modifyStatusDamage`（どく・もうどくなら最大HPの1/8回復して0を返す） |
| マジックガード | `preventsIndirectDamage = true`（`preventsRecoil` も残す） |
| いしあたま | `preventsRecoil = true`（作成済み） |
| ヘドロえき | `reversesDrainHeal = true`（ちからをすいとるは `applyDrainHeal` で回復するので、HPが満タンでもダメージを受ける） |
| てつのトゲ | `BaseContactRecoilDamageEffect` を継承して `damageDivisor = 8`（`onDamagingHit` で接触したヒットごと） |
| たんじゅん・あまのじゃく | `modifyIncomingStatChange`（`change.rankChange * 2` / `-change.rankChange`） |
| ばんけん | `modifyIncomingStatChange`（`source?.name === 'いかく'` で攻撃の低下を `+1` に） |
| ミラーアーマー | `reflectsStatDrops = true` |
| びんじょう | `onOpponentStatChanged`（上がった分を `applyStatChanges` で写す。`source?.name === 'びんじょう'` なら何もしない） |
| びびり | `onDamagingHit`（むし・ゴースト・あくで素早さ+1）+ `onStatChanged`（`source?.name === 'いかく'` で素早さ+1） |
| せいぎのこころ・じきゅうりょく・みずがため・じょうききかん・わたげ・すなはき・こぼれダネ・ねつこうかん | `onDamagingHit`（タイプは `hit.moveTypeName`。わたげは攻撃側に `applyStatChanges`、すなはき・こぼれダネは天候・フィールドを書き込む） |
| いかりのこうら・ぎゃくじょう（作成済み） | `onAfterMoveHit`（`hit.hpBefore > maxHp / 2` かつ今のHPが半分以下。ぎゃくじょうは特攻+1を `applyStatChanges` で行う） |
| じしんかじょう・しろのいななき・くろのいななき・ビーストブースト・ソウルハート | `onKnockOut` |

## 9. 一時的な状態（volatile）の仕組み

ちょうはつ・アンコール・ため技・みがわり・やどりぎのタネなどの一時的な状態は、`BattlePokemonStatus.volatileState` に置きます（キーの一覧と片付けは `docs/battle-state.md`）。技・特性の実装では、キーを書く・読むだけにします。技を出す前の判定・技の選択の制限・ため技の流れ・ターン終了時のダメージなどは、エンジンが行います（`docs/battle-state.md` の 10 章）。

- キーを書くときは、必ず `battleContext.battleRepository.patchVolatileState`（または 9.1 の `applyVolatile`）を使う。丸ごと書かない
- 効果を書いたあとに続けて読むときは、`findBattlePokemonStatusById` で読み直す
- 残りターン数はエンジンがターン終了時に減らす。使ったターンの終わりにも 1 減るので、本家（Showdown）の condition の `duration` と同じ値を書く。本家が「相手がまだ行動していない / もう行動した」で `duration` を 1 変える技（ちょうはつ・かなしばりなど）は、`battleContext.defenderPendingMoveId` があるか（相手がまだ行動していない）で決める

### 9.1 付与と判定

#### canApplyVolatile / applyVolatile / tryApplyVolatile

- シグネチャ: `canApplyVolatile(target, kind, ctx, { source? }): Promise<boolean>`、`applyVolatile(target, patch, ctx): Promise<BattlePokemonStatus | undefined>`、`tryApplyVolatile(target, kind, patch, ctx, { source? }): Promise<boolean>`
- 場所: `src/modules/pokemon/domain/battle-events/volatile-infliction.ts`。`kind` と VolatileState のキーの対応は `VOLATILE_KIND_KEYS`
- 判定: ひんし・すでにその状態なら付与できない。やどりぎのタネはくさタイプに、メロメロは性別が違わないと（性別不明も）付与できない。あくびは状態異常があるか、ねむりを防ぐ特性なら付与できない。最後に対象の特性の `canReceiveVolatile`（相手の技ではかたやぶりで無視）
- 使う技・特性: ちょうはつ・アンコール・かなしばり・いちゃもん・かいふくふうじ・メロメロ・あくび・やどりぎのタネ・ほろびのうた・あくむ・のろい・テレキネシス・でんじふゆう・タールショット・たこがため・みやぶる・ミラクルアイ・こころのめ・ロックオン・ねをはる・アクアリング・ふういん・よこどり・みちづれ・おんねん・ふんじん・じゅうでん・でんきにかえる・ふうりょくでんき・メロメロボディ・のろわれボディ
- 注: みがわりで防ぐかはエンジンが判定する（相手を対象にする変化技は、`bypassSubstitute` の技でなければ失敗する）

```ts
const applied = await tryApplyVolatile(defender, 'taunt', { tauntTurns: ctx.defenderPendingMoveId ? 3 : 4 }, ctx, { source: moveEffectSource(attacker, ctx) });
return applied ? 'fell for the taunt!' : 'But it failed';
```

#### canReceiveVolatile（特性、対象側）

- シグネチャ: `canReceiveVolatile?(holder, kind: VolatileKind, ctx?, source?: EffectSource): boolean | undefined`
- 呼ばれる場所: `canApplyVolatile`。相手の技で付与されるときは、かたやぶりで無視される
- 使う特性: アロマベール（ちょうはつ・アンコール・かなしばり・いちゃもん・かいふくふうじ・メロメロ）、どんかん（メロメロ・ちょうはつ。作成済み）
- こんらん・ひるみは `canReceiveStatusCondition`（`StatusCondition.Confusion` / `Flinch`）で防ぐ（マイペース・せいしんりょく）

```ts
canReceiveVolatile(_h: BattlePokemonStatus, kind: VolatileKind): boolean | undefined {
  return ['taunt', 'encore', 'disable', 'torment', 'healBlock', 'attract'].includes(kind) ? false : undefined;
}
```

#### こんらん・ひるみ（canInflictStatus / inflictStatus）

- `tryInflictStatus(target, StatusCondition.Confusion, ctx, options)` は `confusionTurns`（2〜5）を、`Flinch` は `flinched` を書く。状態異常があっても付与できる
- 使う技・特性: こんらんにする技（あやしいひかり・ちょうおんぱ・いばる など作成済み）、どくくぐつ、ひるませる技・あくしゅう
- こんらんの自傷・ひるみの行動不能は `BeforeMoveChecker` が行う

```ts
const { inflicted } = await tryInflictStatus(target, StatusCondition.Confusion, ctx, { source: { pokemon: holder, kind: 'ability', name: 'どくくぐつ' } });
return inflicted ? 'became confused!' : null;
```

#### treatedAsStatusCondition（特性）/ getEffectiveStatusCondition

- 型: `readonly treatedAsStatusCondition?: StatusCondition`
- 読む関数: `getEffectiveStatusCondition(pokemon, ctx?)`（同期。技の実行中はコンテキストの `attackerEffectiveStatus` / `defenderEffectiveStatus` を見る）、`resolveEffectiveStatusCondition(pokemon, ctx)`（非同期。特性を引く）、`isEffectivelyAsleep(pokemon, ctx?)`。場所: `pokemon/domain/battle-events/effective-status.ts`
- 状態異常があればその状態異常、なければ特性の `treatedAsStatusCondition` を返す。`statusCondition` には書かない
- 使う特性・技: ぜったいねむり（`StatusCondition.Sleep`）。たたりめ・ゆめくい・ねごと・いびき・めざましビンタ・あくむ（エンジンのあくむのダメージも、これで判定する）

```ts
export class ComatoseEffect extends BaseStatusConditionImmunityEffect {
  protected readonly immuneStatusConditions = [StatusCondition.Sleep, StatusCondition.Burn, StatusCondition.Paralysis, StatusCondition.Poison, StatusCondition.BadPoison, StatusCondition.Freeze] as const;
  readonly treatedAsStatusCondition = StatusCondition.Sleep;
}
```

### 9.2 技を出す前

#### onBeforeMove（特性、使用者）

- シグネチャ: `onBeforeMove?(holder, ctx?): Promise<string | null> | string | null`
- 呼ばれる場所: `BeforeMoveChecker.check`。ねむり・こおりの判定のあと、ひるみの判定の前（本家の優先度 9）。呼ばれた技（ゆびをふるで出た技など）では呼ばない
- 使う特性: なまけ（`volatileState.loafing` を交互に書く）
- メッセージを返すと技を出さない（PP も減らない）
- 反動で動けないターン（`mustRecharge`）は、このフックより前に止まる。そのときエンジンが `loafing` も消すので、はかいこうせんのあとに休むのは 1 ターンだけになる（本家と同じ）

```ts
async onBeforeMove(holder: BattlePokemonStatus, ctx?: BattleContext): Promise<string | null> {
  const loafing = holder.volatileState.loafing === true;
  await ctx?.battleRepository?.patchVolatileState(holder.id, { loafing: loafing ? null : true });
  return loafing ? 'is loafing around!' : null;
}
```

#### onFlinch（特性、使用者）

- シグネチャ: `onFlinch?(holder, ctx?): Promise<string | null>`
- 呼ばれる場所: `BeforeMoveChecker.check`。ひるみで技を出せなかったときに 1 回。メッセージは `Pokemon flinched and couldn't move` のあとに付く
- 使う特性: ふくつのこころ（素早さ +1）

```ts
async onFlinch(holder: BattlePokemonStatus, ctx?: BattleContext): Promise<string | null> {
  if (!ctx) return null;
  return joinStatChangeMessages(await applyStatChanges(holder, [{ statType: 'speed', rankChange: 1 }], ctx, { source: { pokemon: holder, kind: 'ability', name: 'ふくつのこころ' } }));
}
```

#### findMoveRestriction / moveRestrictionMessage

- シグネチャ: `findMoveRestriction(state: VolatileState, move: { moveId, moveName, category }, { imprisonedMoveIds?, phase? }): MoveRestrictionReason | undefined`
- 場所: `battle/domain/logic/move-selection.ts`。エンジンが技を出す前（`BeforeMoveChecker`、`phase: 'execute'`）と、わるあがきを出すかの判定（`ExecuteTurnUseCase`、`phase` なし = `'select'`）で使う
- `phase: 'execute'` では `encore`・`torment`・続けて出せない技を見ない。本家ではこの 3 つは技を選ぶときだけ効く（onDisableMove）ので、ため技の 2 ターン目や出し続ける技は止まらない。行動を決めたあとにアンコールされたときは、エンジンが技を出す前にアンコールされた技に変える
- 判定する状態: `disable` → `healBlockTurns`（回復技）→ `throatChopTurns`（音技）→ `tauntTurns`（変化技）→ 相手の `imprison` → `encore` → `torment`（直前の技）→ `choiceLockedMoveId` → 続けて出せない技（デカハンマー・ブラッドムーン）。わるあがきは制限を受けない
- 使う技・特性: かなしばり・かいふくふうじ・じごくづき・ちょうはつ・ふういん・アンコール・いちゃもん・ごりむちゅう・のろわれボディ。技の実装は、キーを書くだけでよい

```ts
// かなしばり: 本家と同じく、相手がまだ行動していなければ 4、もう行動していれば 5 を書く
const moveId = defender.volatileState.lastMoveId;
if (!moveId || !(await tryApplyVolatile(defender, 'disable', { disable: { moveId, turns: ctx.defenderPendingMoveId ? 4 : 5 } }, ctx, { source: moveEffectSource(attacker, ctx) }))) return 'But it failed';
```

### 9.3 技の流れ

#### chargeTurn（技のプロパティ）と MoveBehaviors の charge

- 型: `readonly chargeTurn?: { skipCharge?(attacker, ctx): boolean; onCharge?(attacker, defender, ctx): Promise<string | null> }`
- 呼ばれる場所: `MoveLifecycle.handleChargeTurn`。`MoveBehaviors` の `charge` を持つ技か `chargeTurn` を持つ技は、1 ターン目に `chargingMoveId`（隠れる技は `semiInvulnerable` も）を書いて `Used <技> and began charging` で終わる。2 ターン目は選んだ行動にかかわらずその技を出し（PP は減らない）、ためた状態を消してから技の本体に進む
- 晴れのソーラービーム・ソーラーブレードと、雨のエレクトロビームは、技の効果がなくてもエンジンがためずに出す（`MoveLifecycle` の `WEATHER_SKIP_CHARGE`）。下の例は、ほかの条件でためない技を作るときの書き方
- 使う技: ソーラービーム・ソーラーブレード（晴れならためない。エンジンが判定する）・エレクトロビーム（雨ならためない。エンジンが判定する）・メテオビーム（`onCharge` で特攻 +1）・ロケットずつき（`onCharge` で防御 +1）・ジオコントロール（2 ターン目の `onUse` で能力を上げる）・そらをとぶ・あなをほる・ダイビング・シャドーダイブ・ゴーストダイブ・とびはねる・ゴッドバード・かまいたち
- 隠れている相手に当たる技とダメージ 2 倍の技は `MoveBehaviors.hitsSemiInvulnerable` / `doublesAgainstSemiInvulnerable` の表にある（かぜおこし・かみなり・じしん・なみのりなど）。エンジンが判定する

```ts
readonly chargeTurn: ChargeTurnConfig = {
  skipCharge: (_attacker, ctx) => getContextWeather(ctx) === Weather.Sun,
};
```

#### lockedIn（技のプロパティ）と MoveBehaviors の lockedMove

- 型: `readonly lockedIn?: { turns: number | [min, max]; confusesAtEnd?: boolean; preventsSleep?: boolean; endsOnMiss?: boolean }`
- 呼ばれる場所: `MoveLifecycle.afterMove`。1 ターン目に当たったら `lockedInMove`（使ったターンのあとの残りターン数）を書き、次からは選んだ行動にかかわらずその技を出す（PP は減らない）。失敗・技を出せなかった・`endsOnMiss` で外れたら止まる。最後まで出したら `confusesAtEnd` でこんらんする。`preventsSleep` なら `uproar` を書き、当たるたびに場のねむっているポケモンを起こす。最後まで出したターンは、ターン終了時まで `uproar` が残る（そのターンの終わりのあくびでも眠らない）
- `MoveBehaviors` の `lockedMove`（あばれる・げきりん・はなびらのまいなど、Showdown で lockedmove になる技）は、`lockedIn` がなくても `{ turns: [2, 3], confusesAtEnd: true }` で動く
- 使う技: さわぐ（`{ turns: 3, preventsSleep: true }`）、ころがる・アイスボール（`{ turns: 5, endsOnMiss: true }`）
- ころがるの威力は、`lockedInMove` から何ターン目かを求める（1 ターン目は `lockedInMove` がない）

```ts
readonly lockedIn: LockedInMoveConfig = { turns: 5, endsOnMiss: true };
modifyMovePower(attacker: BattlePokemonStatus, _d: BattlePokemonStatus, ctx: BattleContext): number {
  const locked = attacker.volatileState.lockedInMove;
  return 30 * 2 ** (locked?.moveId === ctx.moveId ? 5 - locked.turns : 0);
}
```

#### lastMoveId・consecutiveMoveCount（読むだけ）

- エンジンが書く（`docs/battle-state.md` の 4 章）。技の処理の中では、使用者の `lastMoveId` はもう今の技になっている。`consecutiveMoveCount` は「この技を直前まで続けて成功させた回数」（初めてなら、ない）
- 使う技: れんぞくぎり（威力 40・80・160）、みちづれ（続けて使うと失敗）、ものまね・オウムがえし・アンコール・かなしばり・いちゃもん・うらみ・さいはい（相手の `lastMoveId` を読む）、まねっこ（`getGlobalFieldState(battle.sideState).lastMoveId`。エンジンは技を出し終えてから書くので、技の処理の中で `findById` で読み直しても、まねっこ自身ではなく直前に出た技が入っている）

```ts
shouldFail(attacker: BattlePokemonStatus): boolean {
  return (attacker.volatileState.consecutiveMoveCount ?? 0) > 0; // みちづれ
}
```

#### isProtectionMove（技のプロパティ）

- 型: `readonly isProtectionMove?: boolean`
- 参照する場所: `MoveLifecycle.recordMoveUse`。`true` でない技（と、技の `protection` を持たない技。13.5）を出すと、エンジンが `protectCount` を消す
- まもる系の技は、`isProtectionMove` ではなく技の `protection`（13.5）を使う。`protection` があれば、成功判定・守りの書き込み・`protectCount` の更新もエンジンが行う
- 使う技: 今は使う技はない（`protection` で足りる）。`protection` を持たないのに `protectCount` を残す技を作るときだけ使う

```ts
export class ProtectEffect implements IMoveEffect {
  readonly isProtectionMove = true;
}
```

#### onTurnStart（技）

- シグネチャ: `onTurnStart?(user, opponent, ctx): Promise<string | null>`
- 呼ばれる場所: `ExecuteTurnUseCase`。行動順を決めたあと、どちらの技よりも先に、技を選んだポケモンごとに行動順で呼ぶ（反動で動けないポケモンでは呼ばない）。メッセージは結果に `action: 'turnStart'` として入る
- 使う技: くちばしキャノン（`beakBlast` を書く。くちばしキャノンを撃ったとき、またはターン終了時に消える。接触技を受けたときのやけどはエンジンが行う）、きあいパンチ

```ts
async onTurnStart(user: BattlePokemonStatus, _o: BattlePokemonStatus, ctx: BattleContext): Promise<string | null> {
  await ctx.battleRepository?.patchVolatileState(user.id, { beakBlast: true });
  return 'started heating up its beak!';
}
```

#### MoveBehaviors（技の性質の表）

- シグネチャ: `MoveBehaviors.has(moveName, behavior)`、`MoveBehaviors.get(moveName)`、`MoveBehaviors.namesWith(behavior)`、`MoveBehaviors.semiInvulnerableKind(moveName)`
- 場所: `pokemon/domain/moves/move-behaviors.ts`（表は `move-behavior-table.ts`。Showdown の flags から作った）
- 性質: `snatch`・`dance`・`bypassSubstitute`・`charge`・`recharge`・`lockedMove`・`futureMove`・`failCopycat`・`failEncore`・`failInstruct`・`failMeFirst`・`failMimic`・`noAssist`・`noSleepTalk`・`noSketch`・`metronome`・`mirror`・`cantUseTwice`・`mustPressure`・`reflectable`・`gravity`・`defrost`・`sleepUsable`
- 使う技・特性: ゆびをふる（`metronome`）・ねごと（`noSleepTalk`）・ねこのて（`noAssist`）・まねっこ（`failCopycat`）・オウムがえし（`mirror`）・ものまね（`failMimic`）・スケッチ（`noSketch`）・さきどり（`failMeFirst`）・さいはい（`failInstruct`）・アンコール（`failEncore`）・おどりこ（`dance`）
- エンジンが読む性質: `charge`・`recharge`・`lockedMove`・`futureMove`・`snatch`・`bypassSubstitute`・`mustPressure`・`defrost`・`sleepUsable`・`cantUseTwice`

```ts
const candidates = MoveBehaviors.namesWith('metronome');
const moveName = candidates[Math.floor(Math.random() * candidates.length)];
```

#### みらいよち・はめつのねがい（MoveBehaviors の futureMove）

- 技の効果は要らない。エンジンが、使ったときに相手の陣営に `futureAttack` を置き（すでにあれば失敗）、2 ターン後のターン終了時に、その陣営の場のポケモンへ技の流れに乗せて当てる（`MoveExecutorService.executeFutureAttacks`）。PP は減らず、みちづれ・おんねんは発動しない。当たったメッセージは、ターンの結果に `action: 'futureAttack'`（`trainerId` は技を使ったポケモンのトレーナー）として入る
- 注: 本家は使ったポケモンが場にいないとき特性・持ち物の補正を受けないが、ここでは特性の補正も受ける

#### locksMoveChoice / infiltrates / modifyOpponentPpDeduction（特性）

| フック | 型・シグネチャ | 呼ばれる場所 | 使う特性 |
| --- | --- | --- | --- |
| `locksMoveChoice` | `readonly locksMoveChoice?: boolean` | `MoveLifecycle.recordMoveUse`。最初に出した技を `choiceLockedMoveId` に書く（わるあがきを除く。交代で消える） | ごりむちゅう |
| `infiltrates` | `readonly infiltrates?: boolean` | 技の本体・`DamageCalculator`・`canInflictStatus`・`applyStatChanges`。相手のみがわり・壁・しんぴのまもり・しろいきりを無視する | すりぬけ |
| `modifyOpponentPpDeduction` | `(holder, user, ctx?) => number \| undefined` | `MoveLifecycle.consumePp`。相手を対象にする技と `mustPressure` の技で、余分に減らす PP。かたやぶりでは無視されない | プレッシャー |

```ts
export class GorillaTacticsEffect implements IAbilityEffect { readonly locksMoveChoice = true; }
export class InfiltratorEffect implements IAbilityEffect { readonly infiltrates = true; }
export class PressureEffect implements IAbilityEffect { modifyOpponentPpDeduction(): number { return 1; } }
```

### 9.4 別の技を出す（callMove）

#### battleContext.callMove

- シグネチャ: `callMove(request: { moveId?; moveName?; user?; target?; calledBy; powerMultiplier?; runBeforeMoveChecks?; consumePp? }): Promise<string>`（`pokemon/domain/battle-events/called-move.ts`）
- 入る場所: 技の実行のコンテキスト（`onUse`・`onHit`・`afterDamage` など）と、`onOpponentMoveUsed` のコンテキスト
- 呼んだ技は、特性の無効化・命中判定・ダメージ・追加効果のすべてを通る。既定では PP は減らず、技を出す前の判定もしない。使用者の `lastMoveId` は呼んだ技のまま、`GlobalFieldState.lastMoveId` は（行動が終わったときに）呼ばれた技になる。呼ばれた技の中では `ctx.calledBy` に呼んだ技の名前が入る。3 段より深く呼ぶと `But it failed`
- `user` を渡すと、そのポケモンが技を出す（さいはい・おどりこ）。`target` を省くと、`user` の相手
- `runBeforeMoveChecks: true` を渡すと、`user` の技を出す前の判定（ねむり・こおり・ひるみ・技の制限・こんらん・メロメロ・まひ）をする。止まったら技を出さず、そのメッセージを返す。おどりこは `{ runBeforeMoveChecks: true }`、さいはいは `{ runBeforeMoveChecks: true, consumePp: true }` を渡す（本家ではどちらも技を出す前の判定を通る）
- `consumePp: true` を渡すと、`user` が自分で出したのと同じに扱う。その技の欄の PP を減らし（プレッシャーも）、`user` の `lastMoveId`・こだわりなどを書く（さいはい）
- `powerMultiplier` は威力に 4096 分率で掛ける（さきどり = 1.5）
- 同じポケモンが同じ相手に出す呼ばれた技（ゆびをふる・ねごとなど）では、`ctx.defenderPendingMoveId`・`ctx.isLastToMove` は呼んだ技と同じ値になる（ふいうち・アナライズ・ターン数の調整が効く）。別のポケモンが出すとき（さいはい・おどりこ・よこどり）は入らない
- 技を名前で呼ぶには、技のリポジトリの `findByName` を使う（Prisma のリポジトリは実装済み）
- 使う技・特性: ゆびをふる・ねごと・まねっこ・オウムがえし・さきどり・ねこのて・しぜんのちから・さいはい・おどりこ。よこどりはエンジンが行う（相手が `snatch` を持っていれば、`MoveBehaviors` の `snatch` の技を相手が代わりに出す）

```ts
async onUse(_a: BattlePokemonStatus, defender: BattlePokemonStatus, ctx: BattleContext): Promise<string | null> {
  const moveId = defender.volatileState.lastMoveId;
  return moveId ? ctx.callMove!({ moveId, calledBy: 'オウムがえし' }) : 'But it failed';
}
```

#### 技を選ぶ情報（moveRepository・defenderPendingMoveId）

| 項目 | 内容 | 使う技 |
| --- | --- | --- |
| `ctx.moveRepository` | 技のリポジトリ（技名・分類・PP を引く） | ねごと・ねこのて・ものまね・スケッチ（候補の技の名前を調べる） |
| `ctx.defenderPendingMoveId` | 相手がこのターンにまだ技を出していなければ、出す予定の技の ID | さきどり（ダメージ技なら 1.5 倍で出す）・ふいうち・残りターン数の調整（9 章の初め） |
| `ctx.moveId` | 今の技の ID | のろわれボディ（受けた技をかなしばり）・ころがる |

```ts
const pending = ctx.defenderPendingMoveId;
const move = pending ? await ctx.moveRepository?.findById(pending) : null;
return move && move.category !== 'Status' ? ctx.callMove!({ moveId: move.id, calledBy: 'さきどり', powerMultiplier: 1.5 }) : 'But it failed';
```

#### onOpponentMoveUsed（特性）

- シグネチャ: `onOpponentMoveUsed?(holder, user, ctx?): Promise<string | null>`
- 呼ばれる場所: `executeMove` の最後。相手の技の処理がすべて終わったあと。次のときは呼ばない: 技を出す前の判定で止まった、技が外れた・失敗した（本家の moveDidSomething）、`holder` が隠れている（そらをとぶなど）、呼ばれた技のあと
- `ctx.moveName` / `ctx.moveId` は相手が最後に出し始めた技（ゆびをふるでちょうのまいが出たら、ちょうのまい）。`ctx.callMove` は `holder` が技を出す
- 使う特性: おどりこ（`MoveBehaviors` の `dance` の技を出し直す）

```ts
async onOpponentMoveUsed(_h: BattlePokemonStatus, _u: BattlePokemonStatus, ctx?: BattleContext): Promise<string | null> {
  return ctx?.moveName && ctx.moveId && MoveBehaviors.has(ctx.moveName, 'dance') ? ctx.callMove!({ moveId: ctx.moveId, calledBy: 'おどりこ', runBeforeMoveChecks: true }) : null;
}
```

### 9.5 PP・技の欄・回復

#### reducePp

- シグネチャ: `reducePp(pokemon, moveId, amount, ctx): Promise<number>`（`pokemon/domain/battle-events/pp.ts`）。実際に減らした PP を返す
- `moveSlotOverrides` の技ならその PP を減らす。0 未満にはしない
- 使う技: うらみ（4）。おんねん・プレッシャーはエンジンが行う

```ts
const lastMoveId = defender.volatileState.lastMoveId;
const reduced = lastMoveId ? await reducePp(defender, lastMoveId, 4, ctx) : 0;
return reduced > 0 ? `reduced its PP by ${reduced}!` : 'But it failed';
```

#### resolveMoveSlots / findMoveSlot（moveSlotOverrides）と updateBattlePokemonMove

- シグネチャ: `resolveMoveSlots(moves: BattlePokemonMove[], state): MoveSlot[]`、`findMoveSlot(slots, moveId)`（`battle/domain/logic/move-selection.ts`）。`MoveSlot` は `{ battlePokemonMoveId, moveId, currentPp, maxPp, isOverride }`
- 交代で戻る入れ替え（ものまね・へんしん）は `moveSlotOverrides` に書く。技を選ぶ処理と PP を減らす処理がこれを先に見る
- ずっと残る書き換え（スケッチ）は `battleRepository.updateBattlePokemonMove(id, { moveId, currentPp, maxPp })`
- 使う技: ものまね・スケッチ・へんしん・ねごと（自分の技の候補）・ねこのて（味方の技は `findBattlePokemonStatusByBattleId` で同じトレーナーのポケモンを引き、`findBattlePokemonMovesByBattlePokemonStatusId` で技を引く）

```ts
const slots = resolveMoveSlots(await repo.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id), attacker.volatileState);
const own = findMoveSlot(slots, ctx.moveId!);
await repo.patchVolatileState(attacker.id, { moveSlotOverrides: [...(attacker.volatileState.moveSlotOverrides ?? []), { battlePokemonMoveId: own!.battlePokemonMoveId, moveId: copied.id, currentPp: copied.pp, maxPp: copied.pp }] });
```

#### applyHeal / isHealBlocked / fractionOfMaxHp

- シグネチャ: `applyHeal(target, amount, ctx): Promise<number>`、`isHealBlocked(pokemon): boolean`、`fractionOfMaxHp(pokemon, divisor): number`（`pokemon/domain/battle-events/heal.ts`）
- `applyHeal` はかいふくふうじ中（`healBlockTurns`）・ひんしなら回復しない。最大 HP を超えない。`fractionOfMaxHp` は本家と同じく切り捨て・最低 1
- `applyDrainHeal` もかいふくふうじ中は回復しない（ヘドロえきのダメージは受ける）
- 使う技・特性: 回復する技・特性はすべてこれを使う（ポイズンヒール・あめうけざら・アイスボディ・ちょすい・ちくでん・どしょく・かんそうはだ・じょうかは乗せ換え済み）。のみこむ・ねがいごと（`healAmount` を決める）
- 回復と状態異常の回復を一度に書く技（`BaseHealEffect`・`BaseSelfHealEffect`）は、`isHealBlocked` で HP の回復だけをやめる（いやしのはどうなどで、かいふくふうじ中の相手を回復しようとしたときも回復しない）
- 注: さいせいりょく（交代で引っ込むときの回復）・いたみわけは、本家でもかいふくふうじで止まらないので使わない

```ts
const healed = await applyHeal(attacker, fractionOfMaxHp(attacker, 4), ctx); // のみこむ（1 回）
return healed > 0 ? `restored ${healed} HP!` : 'But it failed';
```

### 9.6 エンジンが読む補正（volatile-modifiers.ts）

技・特性からは呼びません。キーを書けば、エンジンが次の関数で補正します（`battle/domain/logic/volatile-modifiers.ts`）。

| 関数 | 補正 | キー |
| --- | --- | --- |
| `applyStatOverrides(stats, state)` | ランク補正の前の実数値を置き換える（ダメージ計算・行動順） | `statOverrides`（パワートリック・パワーシフト・ガードシェア・パワーシェア・スピードスワップ） |
| `ignoresTypeImmunityByVolatile` | 相性 0 を等倍にする | `foresight`・`miracleEye`・`ingrain` |
| `typeEffectivenessMultiplierByVolatile` | ほのお 2 倍 / じめん 0 倍 | `tarShot` / `magnetRiseTurns`・`telekinesisTurns` |
| `basePowerModifierByVolatile` | でんき技の威力 2 倍 | `charged` |
| `semiInvulnerableDamageMultiplier` | 隠れている相手へのダメージ 2 倍 | `semiInvulnerable` |
| `ignoresPositiveEvasionByVolatile` | 上がった回避ランクを 0 として扱う | `foresight`・`miracleEye` |
| `alwaysHitsByVolatile` | 必ず当たる | 使用者の `lockOnTurns`、相手の `telekinesisTurns` |

```ts
// パワートリック: 攻撃と防御の実数値を入れ替える（ctx.attackerStats は上書きを反映した値）
const { attack, defense } = ctx.attackerStats!;
await ctx.battleRepository?.patchVolatileState(attacker.id, { statOverrides: { ...attacker.volatileState.statOverrides, attack: defense, defense: attack } });
```

- 注: 一撃必殺技は、本家ではテレキネシスでも必ずは当たらないが、ここでは必ず当たる
- 注: ねをはるで地面にいても、ふゆうの特性は無視しない（防御側特性の `isImmuneToType` がそのまま効く）

### 9.7 みがわり・交代

#### みがわり（substituteHp）

- 技はみがわりの HP（最大 HP の 1/4 の切り捨て）を `substituteHp` に書き、自分の HP を減らす。ダメージを受ける・消えるのはエンジンが行う
- みがわりに当たったときは `onHit`・接触時の特性・`onDamagingHit` を呼ばず、`afterDamage` だけ呼ぶ（`ctx.hitSubstitute === true`。`damage` はみがわりに与えた量）

```ts
const cost = Math.floor(attacker.maxHp / 4);
await ctx.battleRepository?.updateBattlePokemonStatus(attacker.id, { currentHp: attacker.currentHp - cost });
await ctx.battleRepository?.patchVolatileState(attacker.id, { substituteHp: cost });
```

#### findSwitchBlocker / executeSwitch の transfer

- シグネチャ: `findSwitchBlocker(state, typeNames, { trappedByAbility?, fairyLock? }): 'ingrain' | 'trapped' | 'partialTrap' | 'trappingAbility' | 'fairyLock' | undefined`（`battle/domain/logic/switch-restriction.ts`）、`PokemonSwitcherService.executeSwitch(battle, trainerId, trainedPokemonId, { transfer?: 'batonPass' | 'shedTail' }): Promise<string[]>`
- 呼ばれる場所: `ExecuteTurnUseCase`（交代を選んだとき。できなければ `Cannot switch out because it is trapped`）
- 使う技: くろいまなざし・とおせんぼう・クモのす・たこがため（`trappedByStatusId` を書く）、ねをはる（`ingrain`）、しめつける系（`partialTrap`）、バトンタッチ・しっぽきり（技の `selfSwitch: 'batonPass'` / `'shedTail'`。エンジンが `transfer` を渡す。11.5）。かげふみなどは 11.6、フェアリーロックは 11.3

```ts
await tryApplyVolatile(defender, 'trap', { trappedByStatusId: attacker.id }, ctx, { source: moveEffectSource(attacker, ctx) });
```

## 10. 一時的な状態の項目ごとに使うもの

| 技・特性 | 使うもの |
| --- | --- |
| さわぐ | `lockedIn = { turns: 3, preventsSleep: true }`。ねむりの防止と、始めたときに起こすのはエンジン |
| ものまね | 相手の `lastMoveId`（`failMimic` でない）を `moveSlotOverrides` に書く（9.5） |
| ゆびをふる | `MoveBehaviors.namesWith('metronome')` から選び `callMove({ moveName })` |
| オウムがえし | 相手の `lastMoveId`（`mirror` の技）を `callMove` |
| こころのめ・ロックオン | `tryApplyVolatile(attacker, 'lockOn', { lockOnTurns: 2 })`。必中と隠れた相手への命中はエンジン |
| うらみ | 相手の `lastMoveId` に `reducePp(defender, id, 4, ctx)` |
| みやぶる・かぎわける | `tryApplyVolatile(defender, 'foresight', { foresight: true })` |
| ミラクルアイ | `tryApplyVolatile(defender, 'miracleEye', { miracleEye: true })` |
| スケッチ | 相手の `lastMoveId`（`noSketch` でない）で `updateBattlePokemonMove(slot.battlePokemonMoveId, { moveId, currentPp, maxPp })` |
| メロメロ | `tryApplyVolatile(defender, 'attract', { infatuatedWithStatusId: attacker.id }, ctx, { source })`（性別の判定は中で行う）。50% で動けないのはエンジン |
| いちゃもん | `tryApplyVolatile(defender, 'torment', { torment: true })` |
| ねこのて | 味方の技（`noAssist` でない）から選び `callMove` |
| ふういん | `tryApplyVolatile(attacker, 'imprison', { imprison: true })` |
| よこどり | `tryApplyVolatile(attacker, 'snatch', { snatch: true })`。奪うのはエンジン |
| たくわえる・のみこむ | `stockpileCount`・`stockpileBoosts` を書く。のみこむの回復は `applyHeal` |
| パワートリック・パワーシフト・ガードシェア・パワーシェア・スピードスワップ | `statOverrides` を書く（9.6）。シェアは両者の実数値の平均（切り捨て） |
| さきどり | `ctx.defenderPendingMoveId` の技（`failMeFirst` でないダメージ技）を `callMove({ powerMultiplier: 1.5 })` |
| まねっこ | `getGlobalFieldState(battle.sideState).lastMoveId`（`failCopycat` でない）を `callMove` |
| さいはい | 相手の `lastMoveId`（`failInstruct` でない）を `callMove({ user: defender, runBeforeMoveChecks: true, consumePp: true })` |
| タールショット | 素早さ -1 と `tryApplyVolatile(defender, 'tarShot', { tarShot: true })` |
| たこがため | `trappedByStatusId` と `octolock` を書く。毎ターンの低下・交代の制限はエンジン |
| あくむ | 相手がねむり（`isEffectivelyAsleep`）なら `tryApplyVolatile(defender, 'nightmare', { nightmare: true })` |
| ねごと | 自分の技（`noSleepTalk`・ため技でない）から選び `callMove`。ねむっていても出せるのはエンジン（`sleepUsable`） |
| あくび | `tryApplyVolatile(defender, 'yawn', { yawnTurns: 2 })`。眠らせるのはエンジン |
| やどりぎのタネ | `tryApplyVolatile(defender, 'leechSeed', { leechSeed: true })`。吸うのはエンジン |
| のろい | ゴーストなら HP を最大 HP の 1/2 払って `tryApplyVolatile(defender, 'curse', { cursed: true })` |
| みちづれ | `shouldFail`（`consecutiveMoveCount > 0`）と `destinyBond: true`。発動はエンジン |
| ほろびのうた | 両者に `perishCount: 3`（すでにあるポケモン・ぼうおんは除く）。ひんしにするのはエンジン |
| かなしばり | 相手の `lastMoveId` で `disable: { moveId, turns }`（9.2） |
| アンコール | 相手の `lastMoveId`（`failEncore` でない）で `encore: { moveId, turns: ctx.defenderPendingMoveId ? 3 : 4 }`（本家は相手がもう行動していれば 1 足す）。技の強制はエンジン（このターンにまだ行動していない相手も、このターンからアンコールされた技を出す） |
| ちょうはつ | `tauntTurns: 3`（相手がもう行動していれば 4。9.1） |
| ねをはる | `ingrain: true`。回復・交代の制限・じめん技はエンジン |
| おんねん | `grudge: true`。発動はエンジン |
| かいふくふうじ | `healBlockTurns: 5`。回復技の制限・回復の防止はエンジン（`applyHeal`） |
| アクアリング | `aquaRing: true`。回復はエンジン |
| でんじふゆう | `magnetRiseTurns: 5`。じめん技の無効はエンジン |
| テレキネシス | `telekinesisTurns: 3`。必中・じめん技の無効はエンジン |
| ふんじん | `powder: true`。爆発はエンジン |
| ジオコントロール | `MoveBehaviors` の `charge`（ため技）。2 ターン目の `onUse` で特攻・特防・素早さ +2 |
| ねがいごと | `patchSideConditions(battle.id, attacker.trainerId, { wish: { turns: 2, healAmount: Math.floor(attacker.maxHp / 2) } })`。回復はエンジン |
| しぜんのちから | `battle.field` から技名を決めて `callMove({ moveName })` |
| くちばしキャノン | `onTurnStart` で `beakBlast: true`（9.3）。やけどはエンジン |
| プレッシャー | `modifyOpponentPpDeduction` で 1 |
| なまけ | `onBeforeMove` で `loafing` を交互に書く（9.2） |
| メロメロボディ | 接触技を受けたとき 30% で `tryApplyVolatile(attacker, 'attract', ..., { source: { pokemon: holder, kind: 'ability' } })` |
| ふくつのこころ | `onFlinch`（9.2） |
| スロースタート | `switchedInTurn`（`battle.turn - switchedInTurn <= 5`）で攻撃・素早さ半分 |
| のろわれボディ | `onDamagingHit` で 30% `tryApplyVolatile(attacker, 'disable', { disable: { moveId: ctx.moveId, turns: 4 } })` |
| アロマベール | `canReceiveVolatile`（9.1） |
| ぜったいねむり | `treatedAsStatusCondition = StatusCondition.Sleep` と状態異常の無効化（9.1） |
| おどりこ | `onOpponentMoveUsed`（9.4） |
| ほろびのボディ | 接触技を受けたとき、両者に `perishCount: 3`（すでにあるポケモンは除く） |
| ごりむちゅう | `locksMoveChoice = true` と物理技の攻撃 1.5 倍 |
| でんきにかえる | `onDamagingHit` で `charged: true`。威力 2 倍・消去はエンジン |
| ふうりょくでんき | `onDamagingHit` で `hit` の技が `wind` なら `charged: true`（おいかぜの部分は `tailwindTurns` を見る） |
| どくくぐつ | `onInflictStatus` でこんらん（9.1） |
| じゅうでん | 特防 +1 と `charged: true` |

## 11. 場の状態・設置技・交代の仕組み

壁・おいかぜ・ルーム・フィールド・天候・設置技・交代は、`Battle.sideState`（`SideConditions` / `GlobalFieldState`）と `Battle.weather` / `Battle.field` に置きます（キーの一覧と片付けは `docs/battle-state.md` の 7 章・11 章）。技・特性の実装では、キーを書くか、プロパティを宣言するだけにします。効果（ダメージ半減・素早さ 2 倍・設置技のダメージ・交代など）と、残りターン数を減らすのはエンジンです。

- 書くときは、この章の補助関数か `battleRepository.patchSideConditions` / `patchGlobalFieldState` を使う。`Battle.weather` / `Battle.field` を `update` で直接書かない（残りターン数とゲンシ天候の決まりが守れない）
- 残りターン数は、本家（Showdown）の condition の `duration` と同じ値を書く（使ったターンを含む。使ったターンの終わりにも 1 減る）
- 自分の陣営は `attacker.trainerId`、相手の陣営は `defender.trainerId` で指す

### 11.1 天候・フィールド（setWeather / setTerrain / setPrimalWeather）

- シグネチャ: `setWeather(ctx, weather, turns = 5): Promise<boolean>`、`setTerrain(ctx, field, turns = 5): Promise<boolean>`、`setPrimalWeather(ctx, holder, kind: 'heavyRain' | 'harshSunlight' | 'strongWinds'): Promise<boolean>`（`pokemon/domain/battle-events/field-state.ts`）。変えたら `true`
- 呼ばれる場所: 技の `onUse`・特性の `onEntry` / `onDamagingHit` から呼ぶ。`weatherTurns` / `terrainTurns` が 1 のターン終了時に戻すのはエンジン（`FieldResidualProcessor`）
- 決まり: すでに同じ天候・フィールドなら何もしない。ゲンシ天候の間は `setWeather` が何もしない。`setPrimalWeather` はふつうの天候・別のゲンシ天候を上書きし、`holder` が場を離れたらエンジンが天候を終わらせる
- 基底クラス: `BaseWeatherMoveEffect`（あまごいなど。ゲンシ天候の間は `But it failed`）、`BaseWeatherEffect`（あめふらしなど）、`BaseTerrainMoveEffect`（エレキフィールドなど）、`BaseFieldEffect`（エレキメイカーなど）、`BasePrimalWeatherEffect`（ゲンシ天候の特性）
- 使う技・特性: グラスフィールド、さむいギャグ（ゆき。11.5 の `selfSwitch` と一緒に）、はじまりのうみ・おわりのだいち・デルタストリーム

```ts
export class GrassyTerrainEffect extends BaseTerrainMoveEffect {
  protected readonly field = Field.GrassyTerrain;
  protected readonly message = 'Grassy Terrain was set up!';
}
```

#### primalWeather（特性のプロパティ）と BasePrimalWeatherEffect

- 型: `readonly primalWeather?: PrimalWeather`（`IAbilityEffect`）
- 参照する場所: `PrimalWeatherReleaser`（交代・ひんしの片付け）。ゲンシ天候を出したポケモンが場を離れたとき、場に同じ `primalWeather` の特性のポケモンがいれば、そのポケモンに引き継ぐ
- `BasePrimalWeatherEffect` を継承すると、`onEntry` で `setPrimalWeather` を呼び、`primalWeather` も持つ
- 使う特性: はじまりのうみ（`'heavyRain'`）、おわりのだいち（`'harshSunlight'`）、デルタストリーム（`'strongWinds'`）

```ts
export class PrimordialSeaEffect extends BasePrimalWeatherEffect {
  readonly primalWeather = 'heavyRain' as const;
}
```

- おおあめのほのおの攻撃技・おおひでりのみずの攻撃技の失敗、らんきりゅうの弱点の等倍、ノーてんき・エアロックでの無効は、エンジンが行う（`docs/battle-state.md` の 11 章）

### 11.2 陣営の守り（BaseSideConditionMoveEffect）

- シグネチャ: `abstract class BaseSideConditionMoveEffect { key; turns; message }`（`pokemon/domain/moves/effects/base/base-side-condition-move-effect.ts`）。`key` は `SIDE_TURN_COUNTER_KEYS` のどれか
- 呼ばれる場所: 技の `onUse`。使用者の陣営に `{ [key]: turns }` を書く。すでに張っていれば `But it failed`
- 効果はエンジン: 壁は `DamageCalculator`（急所・すりぬけでは効かない）、おいかぜは行動順、しんぴのまもりは `canInflictStatus` / `canApplyVolatile`、しろいきりは `applyStatChanges`
- 使う技: リフレクター（`reflectTurns`, 5）、ひかりのかべ（`lightScreenTurns`, 5）、オーロラベール（`auroraVeilTurns`, 5。あられ・ゆきでなければ失敗するので `shouldFail` も書く）、おいかぜ（`tailwindTurns`, 4）、おまじない（`luckyChantTurns`, 5）。しんぴのまもり・しろいきりは作成済み

```ts
export class ReflectEffect extends BaseSideConditionMoveEffect {
  protected readonly key = 'reflectTurns';
  protected readonly turns = 5;
  protected readonly message = 'Reflect raised the team\'s Defense!';
}
```

#### preventsCriticalHit（おまじない）

- シグネチャ: `preventsCriticalHit(defenderSide: SideConditions): boolean`（`battle/domain/logic/field-modifiers.ts`）
- 呼ばれる場所: `MoveExecutorService` の急所の判定（13.1）。防御側の陣営で `true` なら急所にしない
- 使う技: おまじない（技は `luckyChantTurns` を書くだけ）

```ts
const side = getSideConditions(battle.sideState, defender.trainerId);
const blocked = preventsCriticalHit(side); // おまじないの間は true
```

### 11.3 両陣営にかかる状態（GlobalFieldState）

技は `patchGlobalFieldState` で書くだけです。効果はエンジンが行います。

| キー（書く値） | 効果（エンジン） | 使う技 |
| --- | --- | --- |
| `trickRoomTurns`（5。すでにあれば `null` で消す） | 同じ優先度なら遅い方が先 | トリックルーム |
| `gravityTurns`（5。すでにあれば失敗） | 命中 6840/4096 倍、`MoveBehaviors` の `gravity` の技を出せない（ゆびをふる・ねごとなどで呼ばれた技も失敗する）、ひこう・ふゆうにもじめん技が当たる | じゅうりょく |
| `wonderRoomTurns`（5。すでにあれば `null` で消す） | 防御と特防の実数値を入れ替える | ワンダールーム |
| `magicRoomTurns`（5。すでにあれば `null` で消す） | なし（持ち物の仕組みがない） | マジックルーム |
| `mudSportTurns` / `waterSportTurns`（5。すでにあれば失敗） | でんき技 / ほのお技の威力 1352/4096 倍 | どろあそび・みずあそび |
| `fairyLockTurns`（2。すでにあれば失敗） | 両方とも交代できない（ゴーストを除く） | フェアリーロック |

```ts
const global = getGlobalFieldState((await ctx.battleRepository!.findById(ctx.battle.id))!.sideState);
await ctx.battleRepository!.patchGlobalFieldState(ctx.battle.id, { trickRoomTurns: global.trickRoomTurns ? null : 5 });
return global.trickRoomTurns ? 'The twisted dimensions returned to normal!' : 'The dimensions were twisted!';
```

- じゅうりょくを張ったときに、場のポケモンの `magnetRiseTurns`・`telekinesisTurns` と、そらをとぶ・とびはねるの `semiInvulnerable: 'air'`・`chargingMoveId` を消すのは技の `onUse` で行う（`patchVolatileState`）

### 11.4 設置技（addEntryHazard / clearSideConditions / swapSideConditions）

- シグネチャ: `addEntryHazard(ctx, trainerId, 'spikes' | 'toxicSpikes' | 'stealthRock' | 'stickyWeb'): Promise<boolean>`、`clearSideConditions(ctx, trainerId, keys): Promise<Array<keyof SideConditions>>`、`swapSideConditions(ctx): Promise<void>`（`pokemon/domain/battle-events/field-state.ts`）。キーの組は `HAZARD_KEYS`・`SCREEN_KEYS`（`battle/domain/state/side-state.ts`）
- 呼ばれる場所: 技の `onUse`・特性の `onEntry` / `onDamagingHit`。`addEntryHazard` は上限（まきびし 3 層・どくびし 2 層・ほかは 1 つ）なら `false`。`clearSideConditions` は実際に消したキーを返す。`swapSideConditions` はコートチェンジ（`COURT_CHANGE_KEYS` だけを入れ替える）
- 場に出たポケモンへの効果はエンジン（`EntryEffectProcessor`。`docs/battle-state.md` の 11 章）
- 使う技・特性: まきびし・どくびし・ステルスロック・ねばねばネット（相手の陣営に置く）、どくげしょう（物理技を受けたら相手の陣営にどくびし）、バリアフリー（両方の陣営の壁を消す）、コートチェンジ、こうそくスピン（自分の陣営の設置技）、きりばらい（作成済み）

```ts
const placed = await addEntryHazard(ctx, defender.trainerId, 'stealthRock');
return placed ? 'Pointed stones float in the air around the opposing team!' : 'But it failed';
```

```ts
// バリアフリー（onEntry）
await clearSideConditions(ctx, ctx.battle.trainer1Id, SCREEN_KEYS);
await clearSideConditions(ctx, ctx.battle.trainer2Id, SCREEN_KEYS);
```

### 11.5 交代（selfSwitch / forceSwitch / switchesOutBelowHalfHp / preventsForcedSwitch）

交代そのものは、行動のすぐあとに `ExecuteTurnUseCase` が行います（`docs/battle-state.md` の 7 章）。交代で出てきたポケモンは、そのターンに行動しません。出てきたポケモンにも、いやしのねがい・設置技・`onEntry` が効きます。

注: 交代先をプレイヤーが選ぶ API はまだないので、控えの先頭（ID の順。強制交代はランダム）を選びます。

#### selfSwitch（技のプロパティ）

- 型: `readonly selfSwitch?: true | 'batonPass' | 'shedTail'`（`IMoveEffect`）
- 参照する場所: `MoveExecutorService` の技の本体の最後（変化技は `onUse` のあと、攻撃技はダメージを与えた・みがわりに当たったとき）。使用者がひんしでなく、控えがいて、`ctx.selfSwitchCancelled` でなく、相手のききかいひが発動していなければ、使用者の陣営に `pendingChoice` を書く。変化技の `onUse` が `But it failed` で始まるメッセージを返したら、エンジンが `ctx.selfSwitchCancelled = true` にする（本家も技が失敗したら交代しない）
- `'batonPass'` は能力ランクと `BATON_PASS_KEYS`、`'shedTail'` は `substituteHp` を次のポケモンに引き継ぐ
- 控えがいないときに失敗する技（テレポート・バトンタッチ・しっぽきり）は、`onUse` で `hasSwitchTarget` を見て `But it failed` を返す（エンジンは交代しないだけで、失敗にはしない）。`But it failed` 以外のメッセージで失敗を表すときは、`ctx.selfSwitchCancelled = true` も立てる
- 使う技: とんぼがえり・ボルトチェンジ・クイックターン（攻撃技）、すてゼリフ・テレポート・さむいギャグ（`true`）、バトンタッチ（`'batonPass'`）、しっぽきり（`'shedTail'`。HP を払ってみがわりを書くのは `onUse`）

```ts
export class TeleportEffect implements IMoveEffect {
  readonly selfSwitch = true;
  async onUse(a: BattlePokemonStatus, _d: BattlePokemonStatus, ctx: BattleContext) { return (await hasSwitchTarget(ctx, a.trainerId)) ? null : 'But it failed'; }
}
```

- すてゼリフは、攻撃・特攻が 1 つも下がらなかった（ミラーアーマーで返したときを除く）ら `ctx.selfSwitchCancelled = true` にする（本家と同じく交代しない）

```ts
const result = await applyStatChanges(defender, [{ statType: 'attack', rankChange: -1 }, { statType: 'specialAttack', rankChange: -1 }], ctx, { source: moveEffectSource(attacker, ctx) });
if (result.applied.length === 0 && result.reflected.length === 0) ctx.selfSwitchCancelled = true;
return joinStatChangeMessages(result);
```

#### forceSwitch（技のプロパティ）と preventsForcedSwitch（特性のプロパティ）

- 型: `readonly forceSwitch?: boolean`（`IMoveEffect`）、`readonly preventsForcedSwitch?: boolean`（`IAbilityEffect`）
- 参照する場所: `MoveExecutorService`。変化技は、相手がひんし・控えなし・ねをはる・`preventsForcedSwitch`（かたやぶりで無視される）なら `onUse` の前に失敗する。攻撃技は、ダメージを与えて相手が残り、交代させられるときだけ。相手の陣営に `forcedSwitch` を書き、行動のすぐあとにランダムな控えと入れ替える
- 使う技・特性: ほえる・ふきとばし（変化技、優先度 -6 は DB の値）、ドラゴンテール・ともえなげ（攻撃技）、きゅうばん（`preventsForcedSwitch = true`）、ばんけん（作成済み）

```ts
export class RoarEffect implements IMoveEffect {
  readonly forceSwitch = true;
}
```

#### switchesOutBelowHalfHp（特性のプロパティ）

- 型: `readonly switchesOutBelowHalfHp?: boolean`（`IAbilityEffect`）
- 参照する場所: `MoveExecutorService`（相手の攻撃技のあと）、`PokemonSwitcherService`（設置技・ターン終了時のダメージ）。HP が最大 HP の半分より上から半分以下（ひんしを除く）になり、控えがいれば `pendingChoice: { reason: 'emergencyExit' }` を書く。かたやぶりでは無視されない
- 発動したら、相手のとんぼがえりなどの交代は起きない（本家と同じ）。そのターンにまだ行動していなければ行動しない
- ドラゴンテール・ともえなげで交代させられるときは、強制交代が先に決まり、ききかいひは発動しない（本家の `forceSwitchFlag`）
- 注: 本家は、ちからずくの使い手の追加効果のある技では発動しないが、ここでは発動する
- 使う特性: ききかいひ・にげごし

```ts
export class EmergencyExitEffect implements IAbilityEffect {
  readonly switchesOutBelowHalfHp = true;
}
```

#### requestSwitch / requestForcedSwitch / hasSwitchTarget / hasFaintedPartyMember

- シグネチャ: `requestSwitch(ctx, trainerId, reason: PendingChoiceReason): Promise<void>`、`requestForcedSwitch(ctx, trainerId): Promise<void>`、`hasSwitchTarget(ctx, trainerId): Promise<boolean>`、`hasFaintedPartyMember(ctx, trainerId): Promise<boolean>`（`pokemon/domain/battle-events/switching.ts`）
- 呼ばれる場所: 技の `onUse` / `onHit`、特性のフック。プロパティで書けないときに使う（判定はしないので、呼ぶ側で確かめる）
- 使う技: さいきのいのり（`revivalBlessing`。エンジンがひんしの手持ちの先頭を最大 HP の半分で復活させる）、みかづきのまい・いやしのねがい（`hasSwitchTarget` で失敗判定）

```ts
// さいきのいのり
if (!(await hasFaintedPartyMember(ctx, attacker.trainerId))) return 'But it failed';
await requestSwitch(ctx, attacker.trainerId, 'revivalBlessing');
```

```ts
// みかづきのまい（自分がひんしになり、次に出てきたポケモンの HP・状態異常・PP を回復する）
if (!(await hasSwitchTarget(ctx, attacker.trainerId))) return 'But it failed';
await ctx.battleRepository!.patchSideConditions(ctx.battle.id, attacker.trainerId, { healingWish: 'lunarDance' });
await ctx.battleRepository!.updateBattlePokemonStatus(attacker.id, { currentHp: 0 });
```

### 11.6 逃げられなくする特性（trapsOpponent）

- シグネチャ: `trapsOpponent?(holder, target: TrapTarget, ctx?): boolean | undefined`（`IAbilityEffect`）。`TrapTarget` は `{ pokemon, typeNames, abilityName?, grounded }`（`pokemon/domain/battle-events/switching.ts`）
- 呼ばれる場所: `PokemonSwitcherService.findSwitchBlocker`（相手が交代を選んだとき、場の相手の特性として）。持ち主がひんし・特性が消されている（`abilitySuppressed`）ときは呼ばない。ゴーストタイプの相手は、`true` を返しても交代できる。とんぼがえり・ほえるなどの交代は止めない
- 使う特性: かげふみ（相手がかげふみでなければ）、ありじごく（相手が地面にいれば）、じりょく（相手がはがねタイプなら）

```ts
trapsOpponent(_holder: BattlePokemonStatus, target: TrapTarget): boolean {
  return target.typeNames.includes('はがね'); // じりょく
}
```

- くろいまなざし・とおせんぼう・クモのすは `trappedByStatusId`（9.7）

### 11.7 手持ちの数（attackerFaintedAllyCount / countFaintedAllies）

- 型・シグネチャ: `battleContext.attackerFaintedAllyCount?: number`、`countFaintedAllies(ctx, holder): Promise<number>`（`pokemon/domain/battle-events/switching.ts`）
- 入る場所: ダメージ技の実行（`beforeDamage` 以降）と、ダメージ計算の特性フック（`modifyBasePower` など）のコンテキスト
- 値: 手持ちがひんしになった延べ数（今ひんしの仲間の数 + 自分を含む手持ちの `persistentState.revivalCount`。さいきのいのりで復活しても減らない。自分が前にひんしになって復活した回数も入る。本家の `side.totalFainted`）
- 注: 本家は場に出たときの数を覚えておく（`effectState.fallen`）。ここでは技を出すたびに数えるが、シングルバトルでは場にいる間に数が変わらないので同じになる
- 使う特性: そうだいしょう（`[4096, 4506, 4915, 5325, 5734, 6144][Math.min(5, n)]` を威力に掛ける）

```ts
modifyBasePower(_p: BattlePokemonStatus, power: number, ctx?: BattleContext): number | undefined {
  const fallen = Math.min(5, ctx?.attackerFaintedAllyCount ?? 0);
  return fallen > 0 ? modifyByFixedPoint(power, [4096, 4506, 4915, 5325, 5734, 6144][fallen]) : undefined;
}
```

### 11.8 エンジンが読む判定（grounded.ts・field-modifiers.ts）

技・特性からも読めます（書き込みはしない）。

| 関数 | 場所 | 用途 |
| --- | --- | --- |
| `isGrounded({ typeNames, abilityName, volatileState, sideState })` | `battle/domain/logic/grounded.ts` | 地面にいるか（フィールド・まきびし・どくびし・ねばねばネット・ありじごく） |
| `screenDamageModifier(side, category, { isCriticalHit, infiltrates })` | `battle/domain/logic/field-modifiers.ts` | 壁の補正（2048 か undefined） |
| `sideSpeedMultiplier(side)` / `isTrickRoomActive(sideState)` / `movesBefore(a, b, trickRoom)` | 同上 | おいかぜ・トリックルームの行動順 |
| `fieldBasePowerModifiers(params)` | 同上 | フィールド・どろあそび・みずあそびの威力補正 |
| `effectivePrimalWeather(sideState, abilityNames)` / `primalWeatherBlocksMove` / `isNeutralizedByStrongWinds` | 同上 | ゲンシ天候（ノーてんき・エアロックで無効） |
| `preventsCriticalHit(side)` | 同上 | おまじない |

```ts
const grounded = isGrounded({ typeNames: target.typeNames, abilityName: target.abilityName, volatileState: target.pokemon.volatileState, sideState: ctx?.battle.sideState });
return grounded; // ありじごく（trapsOpponent では target.grounded が同じ値）
```

## 12. 場の状態・交代の項目ごとに使うもの

| 技・特性 | 使うもの |
| --- | --- |
| ほえる・ふきとばし | `forceSwitch = true`（11.5）。失敗の判定と入れ替えはエンジン |
| まきびし・ステルスロック・ねばねばネット・どくびし | `addEntryHazard(ctx, defender.trainerId, kind)`（11.4）。`false` なら `But it failed` |
| バトンタッチ | `selfSwitch = 'batonPass'` と、控えがいなければ失敗（11.5） |
| すてゼリフ | `selfSwitch = true` と、攻撃・特攻 -1。下がらなければ `selfSwitchCancelled`（11.5） |
| フェアリーロック | `fairyLockTurns: 2`（11.3）。交代できないのはエンジン |
| テレポート | `selfSwitch = true` と、控えがいなければ失敗（11.5） |
| リフレクター・ひかりのかべ・オーロラベール | `BaseSideConditionMoveEffect`（11.2）。オーロラベールは `shouldFail` で `getContextWeather(ctx) !== Weather.Hail` |
| クモのす・くろいまなざし・とおせんぼう | `tryApplyVolatile(defender, 'trap', { trappedByStatusId: attacker.id })`（9.7） |
| どろあそび・みずあそび | `mudSportTurns` / `waterSportTurns: 5`（11.3） |
| コートチェンジ | `swapSideConditions(ctx)`（11.4） |
| さいきのいのり | `hasFaintedPartyMember` で失敗判定と `requestSwitch(ctx, attacker.trainerId, 'revivalBlessing')`（11.5） |
| しっぽきり | `selfSwitch = 'shedTail'`。`onUse` で、控えなし・みがわりがある・`attacker.currentHp <= Math.ceil(attacker.maxHp / 2)` なら `But it failed` を返す（エンジンが交代を止める。ほかのメッセージで失敗するなら `ctx.selfSwitchCancelled = true` も立てる）。成功なら `Math.ceil(maxHp / 2)` を払い `substituteHp: Math.floor(maxHp / 4)` を書く |
| さむいギャグ | `selfSwitch = true` と `setWeather(ctx, Weather.Hail)`（ゆきがないので近似。7 章） |
| ひかりのかべ | `BaseSideConditionMoveEffect`（`lightScreenTurns`, 5） |
| おいかぜ | `BaseSideConditionMoveEffect`（`tailwindTurns`, 4） |
| じゅうりょく | `gravityTurns: 5` と、場のポケモンの浮く状態・そらをとぶの消去（11.3） |
| トリックルーム | `trickRoomTurns` を 5 と `null` で切り替える（11.3） |
| ワンダールーム | `wonderRoomTurns` を 5 と `null` で切り替える（11.3） |
| どくびし | `addEntryHazard(ctx, defender.trainerId, 'toxicSpikes')`（11.4） |
| みかづきのまい | `hasSwitchTarget` で失敗判定、`healingWish: 'lunarDance'`、自分をひんしにする（11.5）。回復はエンジン |
| グラスフィールド | `BaseTerrainMoveEffect`（`Field.GrassyTerrain`。11.1）。回復・威力はエンジン |
| おまじない | `BaseSideConditionMoveEffect`（`luckyChantTurns`, 5）。急所の防止はエンジン（11.2・13.1） |
| きゅうばん | `preventsForcedSwitch = true`（11.5） |
| かげふみ・じりょく・ありじごく | `trapsOpponent`（11.6） |
| すりぬけ | `infiltrates = true`。壁・しんぴのまもり・しろいきり・みがわりを無視するのはエンジン |
| はじまりのうみ・おわりのだいち・デルタストリーム | `BasePrimalWeatherEffect`（11.1） |
| にげごし・ききかいひ | `switchesOutBelowHalfHp = true`（11.5） |
| バリアフリー | `onEntry` で両方の陣営に `clearSideConditions(ctx, trainerId, SCREEN_KEYS)`（11.4） |
| そうだいしょう | `modifyBasePower` で `ctx.attackerFaintedAllyCount`（11.7） |
| どくげしょう | `onDamagingHit` で `hit.moveCategory === 'Physical'` なら `addEntryHazard(ctx, attacker.trainerId, 'toxicSpikes')`（11.4） |

## 13. 急所・変化技の命中・まもる系・技をはね返す仕組み

急所・まもる系・マジックコートの効果は、エンジンが行います。技・特性の実装では、キーを書くか、プロパティやフックを宣言するだけにします。ダイマックス技・Z 技は対象外です。

### 13.1 急所

エンジンは、攻撃技のヒットごとに急所を引きます（本家の getDamage）。

1. 急所ランクを決める（`baseCriticalHitStage`）: 急所に当たりやすい技（`MoveBehaviors` の `highCritRatio`）は +1、使用者の `critStageBoost`（きあいだめ）を足す。必ず急所になる技（`alwaysCrit`）と使用者の `laserFocusTurns`（とぎすます）は必ず急所（ランク 3）
2. 攻撃側特性の `modifyCritRatio` でランクを変える。0〜3 に収める
3. 防御側特性の `preventsCriticalHit`（かたやぶりで無視される）か、防御側の陣営の `luckyChantTurns`（おまじない）があれば急所にしない
4. ランクごとの確率で引く（ランク 0 = 1/24、1 = 1/8、2 = 1/2、3 以上 = 必ず。第 9 世代）
5. 急所なら、`battleContext.isCriticalHit` を `true` にしてダメージを計算する。基礎ダメージを 1.5 倍（切り捨て）し、攻撃側の下がったランクと防御側の上がったランクを 0 として扱い、壁を無視する。メッセージに `A critical hit!` が付く

#### modifyCritRatio（特性、攻撃側）

- シグネチャ: `modifyCritRatio?(holder, stage: number, battleContext?): number | undefined`
- 呼ばれる場所: `MoveExecutorService.runMoveBody`。攻撃技のヒットのループの前に 1 回（急所はヒットごとに引くが、ランクは技全体で同じ）。`stage` は 1 の手順のあとの急所ランク（0〜3）
- 使う特性: きょううん（`stage + 1`）、ひとでなし（相手がどく・もうどくなら `3`。相手は `battleContext.defender`）

```ts
modifyCritRatio(_holder: BattlePokemonStatus, stage: number): number {
  return stage + 1; // きょううん
}
```

#### preventsCriticalHit（特性のプロパティ、防御側）

- 型: `readonly preventsCriticalHit?: boolean`
- 参照する場所: `MoveExecutorService.runMoveBody` の急所の判定。かたやぶりで無視される（本家の breakable）
- 使う特性: カブトアーマー、シェルアーマー

```ts
export class BattleArmorEffect implements IAbilityEffect {
  readonly preventsCriticalHit = true;
}
```

#### HitResult.isCriticalHit（ヒットの情報）

- 型: `readonly isCriticalHit?: boolean`（`pokemon/domain/battle-events/hit-result.ts`）
- 入る場所: `onDamagingHit`・`onSourceDamagingHit`（このヒットが急所か）、`onAfterMoveHit`（どれかのヒットが急所か）
- 使う特性: いかりのつぼ（急所に当たったら攻撃 +12。本家と同じく、ひんしになったときは上げない）

```ts
async onDamagingHit(holder: BattlePokemonStatus, _a: BattlePokemonStatus, hit: HitResult, ctx?: BattleContext) {
  if (!ctx || !hit.isCriticalHit || hit.targetFainted) return null;
  return joinStatChangeMessages(await applyStatChanges(holder, [{ statType: 'attack', rankChange: 12 }], ctx, { source: { pokemon: holder, kind: 'ability', name: 'いかりのつぼ' } }));
}
```

#### critStageBoost・laserFocusTurns（volatileState）と tryApplyVolatile / applyVolatile

- 種類: `'focusEnergy'`（キーは `critStageBoost`）、`'laserFocus'`（キーは `laserFocusTurns`）。すでにその状態なら `tryApplyVolatile` が `false` を返す
- きあいだめ（`critStageBoost: 2`。`FOCUS_ENERGY_CRIT_STAGE_BOOST`）: `tryApplyVolatile` を使う。すでにきあいだめしていたら失敗する（本家と同じ）
- とぎすます（`laserFocusTurns: 2`）: `applyVolatile` を使う。使ったターンと次のターンの技が必ず急所（ターン終了時にエンジンが減らす）。とぎすましている間にもう一度使っても成功し、`2` に書き直して次のターンまで延びる（本家の onRestart）。`tryApplyVolatile` だと、残りが `1` のときに失敗してしまう
- バトンタッチで引き継ぐ（`BATON_PASS_KEYS`）

```ts
const applied = await tryApplyVolatile(attacker, 'focusEnergy', { critStageBoost: FOCUS_ENERGY_CRIT_STAGE_BOOST }, ctx);
return applied ? 'is getting pumped!' : 'But it failed';
```

```ts
await applyVolatile(attacker, { laserFocusTurns: 2 }, ctx); // とぎすます（いつも書き直す）
return 'concentrated intensely!';
```

#### 急所の補助関数（`battle/domain/logic/critical-hit.ts`）

| 関数・定数 | 用途 |
| --- | --- |
| `criticalHitChance(stage)` | 急所ランクから急所率（1/24・1/8・1/2・1） |
| `rollCriticalHit(stage, random)` | 急所を引く。ランク 3 以上なら乱数を引かずに `true` |
| `baseCriticalHitStage(moveName, volatileState)` | 特性の補正の前の急所ランク |
| `CRITICAL_HIT_DAMAGE_MULTIPLIER` | 1.5 |

```ts
const stage = baseCriticalHitStage('つじぎり', attacker.volatileState); // 1
criticalHitChance(stage); // 1/8
```

#### 急所の乱数（CRITICAL_HIT_RANDOM_TOKEN）とテスト

- `MoveExecutorService` の 5 つめの引数（DI トークン `CRITICAL_HIT_RANDOM_TOKEN`、省略可）が急所の乱数（`() => number`）です。省略すると `Math.random` を使います
- `Math.random` を差し替えるテスト（命中・追加効果）で急所が出ないよう、急所だけ別の乱数にしています
- テストの部品（`createBattleEngine`・`move-executor-test-setup`）は、既定で `NO_CRITICAL_HIT_RANDOM`（急所ランク 3 以上のときだけ急所）を渡します。急所を試すときは `createBattleEngine({ criticalHitRandom: () => 0.01, ... })` のように渡します
- テストで `new MoveExecutorService(...)` を直接作るときも、5 つめに `NO_CRITICAL_HIT_RANDOM` を渡してください。渡さないと 1/24 で急所になり、ダメージの値が揺れます

```ts
const engine = createBattleEngine({ moves, pokemon, criticalHitRandom: () => 0.04 }); // 1/24 より小さいので急所
await engine.runTurn({ moveId: TACKLE.id }, { moveId: SPLASH.id });
```

### 13.2 変化技の命中

相手を対象にする変化技（`MoveFlags.targetsOpponent`）も、命中判定をするようになりました（以前は必ず当たっていた）。

- 命中率が `null` の技は必ず当たる。命中・回避ランク、じゅうりょく、特性の `modifyAccuracy` / `modifyEvasion` も掛かる
- 自分を対象にする変化技・場の技（つるぎのまい・まきびしなど）は命中判定をしない
- 隠れている相手（そらをとぶなど）には、変化技も当たらない（`MoveBehaviors.hitsSemiInvulnerable` の技・ロックオン・ノーガードは当たる）
- どくタイプが使うどくどくは必ず当たり、隠れている相手にも当たる（第 8 世代から。`AccuracyCalculator.alwaysHitsByMoveUser`）
- 威力が null で `modifyMovePower` もない攻撃技は、今までどおり命中判定をしない

`AccuracyCalculator.checkHit` の順番は次のとおりです。

1. 命中率が `null`、または `options.ensuresHit`（どくタイプのどくどく）なら当たる
2. 攻撃側か防御側の特性が `ensuresMoveHit`（ノーガード）なら当たる
3. 使用者の `lockOnTurns`・相手の `telekinesisTurns` なら当たる
4. 特性の `modifyBaseAccuracy`（攻撃側 → 防御側）
5. 命中・回避ランク → じゅうりょく → 攻撃側特性の `modifyAccuracy` → 防御側特性の `modifyEvasion` → 乱数

#### modifyBaseAccuracy（特性、攻撃側・防御側）

- シグネチャ: `modifyBaseAccuracy?(holder, role: 'attacker' | 'defender', accuracy: number, battleContext?): number | undefined`
- 呼ばれる場所: `AccuracyCalculator.checkHit`。命中率が数値の技で、ランク補正の前に攻撃側（`role = 'attacker'`）→ 防御側（`role = 'defender'`。かたやぶりで無視される）の順（本家の ModifyAccuracy）
- 使う特性: ミラクルスキン（防御側で、変化技なら 50）

```ts
modifyBaseAccuracy(_h: BattlePokemonStatus, role: 'attacker' | 'defender', _accuracy: number, ctx?: BattleContext): number | undefined {
  return role === 'defender' && ctx?.moveCategory === 'Status' ? 50 : undefined;
}
```

#### ensuresMoveHit（特性のプロパティ）

- 型: `readonly ensuresMoveHit?: boolean`
- 参照する場所: `AccuracyCalculator.checkHit` と、隠れている相手に届くかの判定（攻撃側・防御側の両方。かたやぶりでは無視されない）
- 使う特性: ノーガード（`NoGuardEffect` は乗せ換え済み）

```ts
export class NoGuardEffect implements IAbilityEffect {
  readonly ensuresMoveHit = true;
}
```

### 13.3 同じ優先度の中の順番（modifyFractionalPriority）

- シグネチャ: `modifyFractionalPriority?(holder, battleContext?): number | undefined`
- 呼ばれる場所: `ActionOrderDeterminerService`（と `ActionOrderDeterminer`）。`modifyPriority` のあとの優先度に足す。-1 より大きく 1 より小さい値を返すので、優先度の違いは越えない（本家の onFractionalPriority）。`battleContext.moveCategory` などは行動するポケモンが選んだ技。技の実行中の `effectivePriority` には入らない
- 使う特性: きんしのちから（変化技なら -0.1）、あとだし（-0.1。`StallEffect` は乗せ換え済み）、クイックドロウ（攻撃技で 30% なら +0.1）
- 素早さを変えないので、トリックルームの間も順番は逆にならない（本家と同じ）。同じ優先度の中で先・後に動かす特性は、`modifySpeed` ではなくこのフックで作る

```ts
modifyFractionalPriority(_holder: BattlePokemonStatus, ctx?: BattleContext): number | undefined {
  return ctx?.moveCategory === 'Status' ? -0.1 : undefined; // きんしのちから
}
```

### 13.4 技によって相手の特性を無視する（breaksMoldFor）

- シグネチャ: `breaksMoldFor?(battleContext?): boolean | undefined`
- 呼ばれる場所: `AbilityRegistry.hasMoldBreaker(name, ctx)` / `isIgnoredByMoldBreaker(attacker, defender, ctx)`。`true` を返す技では、`breaksMold`（かたやぶり）と同じに扱う。技の実行・ダメージ計算・命中判定・`canInflictStatus`・`applyStatChanges`・`canApplyVolatile` が、技のコンテキスト（`moveCategory` など）を渡す
- 使う特性: きんしのちから（変化技なら `true`）
- 自分のファイルで「かたやぶりで止まるか」を判定するとき（ねつこうかんなど）は、`isIgnoredByMoldBreaker(ctx.attackerAbilityName, '<特性名>', ctx)` のように 3 つめにコンテキストを渡す

```ts
export class MyceliumMightEffect implements IAbilityEffect {
  breaksMoldFor(ctx?: BattleContext): boolean { return ctx?.moveCategory === 'Status'; }
  modifyFractionalPriority(_h: BattlePokemonStatus, ctx?: BattleContext): number | undefined { return ctx?.moveCategory === 'Status' ? -0.1 : undefined; }
}
```

### 13.5 まもる系

#### protection（技のプロパティ）

- 型: `readonly protection?: ProtectionMoveConfig`（`{ kind: ProtectionKind }` か `{ side: SideGuardKind }`。`pokemon/domain/moves/move-effect.interface.ts`）
- 参照する場所: `MoveExecutorService.runMoveBody`（変化技の `onUse` の前）と `MoveLifecycle.recordMoveUse`（`protectCount` を残すか）
- エンジンが行うこと（`startProtection`）:
  1. このターン最後に動くなら失敗する（本家の queue.willAct。相手が交代したときなど）
  2. `side: 'matBlock'`（たたみがえし）は、出てから最初の行動（`battle.turn === switchedInTurn + 1`）でなければ失敗する
  3. `kind` の技は、続けて成功させた回数（`protectCount`）から `protectSuccessChance(count)`（1、1/3、1/9、…、最低 1/729）で成功を引く。成功したら `protection` と `protectCount + 1` を書く。失敗したら `protectCount` を消す
  4. `side` の技は、使用者の陣営にそのキーを書く。ワイドガード・ファストガードは `protectCount` も 1 増やす（本家の stall。成功率は下がらない）。トリックガード・たたみがえしは `protectCount` を消す
  5. 失敗したら `onUse` を呼ばずに `Used <技> but it failed`。成功したら `protected itself!`（こらえるは `braced itself!`、陣営の守りは `protected its team!`）のあとに `onUse` のメッセージが付く
- 使う技: まもる・みきり（`{ kind: 'protect' }`）、キングシールド（`'kingsShield'`）、ニードルガード（`'spikyShield'`）、トーチカ（`'banefulBunker'`）、ブロッキング（`'obstruct'`）、スレッドトラップ（`'silkTrap'`）、かえんのまもり（`'burningBulwark'`）、こらえる（`'endure'`）、ワイドガード（`{ side: 'wideGuard' }`）、ファストガード（`'quickGuard'`）、トリックガード（`'craftyShield'`）、たたみがえし（`'matBlock'`）。優先度（まもる 4・ワイドガード 3 など）は DB の値

```ts
export class KingsShieldEffect implements IMoveEffect {
  readonly protection = { kind: 'kingsShield' } as const;
}
```

#### 相手の技を防ぐ（findBlockingGuard）

- シグネチャ: `findBlockingGuard({ protection, side, move: { moveName, category, effectivePriority, bypassesProtect? } }): BlockingGuard | undefined`（`battle/domain/logic/protection.ts`）
- 呼ばれる場所: `MoveExecutorService.runMoveBody`。相手を対象にする技で、特性の `preventsMove`・サイコフィールドのあと、マジックコートと `isImmuneToMove` の前。防いだら技の `onMiss` を呼んで、`Used <技> but it was blocked (<守りの技名>) <onMiss のメッセージ>` で終わる（PP は減る。outcome は `failed`）。とびひざげり・とびげりは、外れたときと同じく最大 HP の 1/2 のダメージを受ける（本家の onMoveFail）
- 判定（本家の onTryHit の順）:
  1. ファストガード: 優先度（`effectivePriority`。いたずらごころを含む）が 1 以上の技（変化技も）
  2. ワイドガード: 相手全体・自分以外全体の技（`MoveBehaviors` の `spread`。じしん・なみのり・なきごえなど）
  3. 自分の守り: まもる・ニードルガード・トーチカは変化技も防ぐ。キングシールド・ブロッキング・スレッドトラップ・かえんのまもりは攻撃技だけ。こらえるは防がない
  4. トリックガード: 変化技（まもるで防げない技も防ぐ）。たたみがえし: 攻撃技
- まもるで防げない技（`MoveBehaviors` の `noProtect`。フェイント・ほえる・ゴーストダイブ・みらいよち・ハイパードリルなど）と、使用者の特性の `bypassesProtection` が `true` の技は、トリックガード以外を通る

```ts
const guard = findBlockingGuard({ protection: defender.volatileState.protection, side, move: { moveName: 'たいあたり', category: 'Physical', effectivePriority: 0 } });
// 'protect' なら防がれる。キングシールドなら接触した使用者の攻撃 -1
```

#### 接触した相手への効果（PROTECTION_CONTACT_EFFECTS）

接触技（`isContactMove`。えんかくなら接触しない）を防いだとき、エンジンが使用者に与えます。

| 守り | 効果 |
| --- | --- |
| キングシールド | 攻撃 -1（第 8 世代から） |
| ブロッキング | 防御 -2 |
| スレッドトラップ | 素早さ -1 |
| ニードルガード | 最大 HP の 1/8（切り捨て・最低 1）の技以外のダメージ（マジックガードで防げる） |
| トーチカ | どく |
| かえんのまもり | やけど |

能力の低下・状態異常は、守ったポケモンが起こしたもの（`{ pokemon: 守ったポケモン, kind: 'other', name: '<守りの技名>' }`）として `applyStatChanges` / `tryInflictStatus` で与えます。クリアボディ・ミラーアーマー・しろいきり・しんぴのまもり・タイプの免疫が効きます。

#### bypassesProtection（特性、攻撃側）

- シグネチャ: `bypassesProtection?(holder, battleContext?): boolean | undefined`
- 呼ばれる場所: `MoveExecutorService` の守りの判定。`true` なら、トリックガード以外の守りを通り抜ける（接触したときの効果も起きない）
- 使う特性: ふかしのこぶし（接触技なら `true`）

```ts
bypassesProtection(_holder: BattlePokemonStatus, ctx?: BattleContext): boolean {
  return ctx ? isContactMove(ctx) : false;
}
```

#### 守りを解く技（MoveBehaviors の breaksProtect）

- 技の効果は要らない。フェイント・シャドーダイブ・ゴーストダイブ・いじげんホール・いじげんラッシュは、命中したら相手の `protection`（こらえるを除く）・`protectCount` と、相手の陣営の `wideGuard`・`quickGuard`・`craftyShield`・`matBlock` を消す（本家の hitStepBreakProtect）。消したらメッセージに `It broke through the protection!` が付く
- この 5 つは `noProtect` も持つので、守りに防がれずに当たる

```ts
MoveBehaviors.has('フェイント', 'breaksProtect'); // true
MoveBehaviors.has('フェイント', 'noProtect'); // true
```

#### こらえる（protection: 'endure'）

- `protection` が `'endure'` のポケモンは、そのターンに技のダメージで HP が 0 になるとき、HP が 1 残る（連続技はヒットごと）。メッセージに `The opponent endured the hit!` が付く
- 技以外のダメージ（どく・すなあらしなど）と、こんらんの自傷では残らない（本家と同じ）

```ts
export class EndureEffect implements IMoveEffect {
  readonly protection = { kind: 'endure' } as const;
}
```

#### まもる系の補助関数（`battle/domain/logic/protection.ts`）

| 関数・定数 | 用途 |
| --- | --- |
| `protectSuccessChance(count)` | 続けて count 回成功させたあとの成功率 |
| `findBlockingGuard(params)` | 相手の技を防ぐ守り |
| `keepsProtectCount(moveEffect)` | 出したあとも `protectCount` を残す技か |
| `hasBreakableProtection(protection, side)` | フェイントなどで解く守りがあるか |
| `GUARD_MOVE_NAMES` / `PROTECTION_CONTACT_EFFECTS` | 守りの技名 / 接触した相手への効果 |

```ts
protectSuccessChance(2); // 1/9
keepsProtectCount({ protection: { side: 'craftyShield' } }); // false
```

### 13.6 技をはね返す（マジックコート・マジックミラー）

- 判定: `MoveExecutorService.runMoveBody`。まもる系の判定のあと、`isImmuneToMove` の前（本家の onTryHit の優先度）。はね返せる技（`MoveBehaviors` の `reflectable`。まきびしなど相手の陣営に置く技を含む）で、相手が次のどれかを持つとき、相手が使用者に同じ技を出し直す（`callMove` と同じ流れ。PP は減らない）
  - `volatileState.magicCoat`（マジックコート。このターンだけ）
  - 特性の `bouncesMoves`（マジックミラー。かたやぶりで無視される）
- はね返した技は、もう一度はね返さない（両方がマジックミラーでも 1 回で止まる）。相手がひんし（同じターンに先にひんしになったときなど）か、隠れている（そらをとぶなど）ときは、はね返さない
- はね返した技の優先度（`effectivePriority`）は、元の技の優先度を引き継ぐ。はね返した側のいたずらごころは足さない（本家の useMoveInner）。元の使用者のテイルアーマー・ファストガードなどで止まるかは、この優先度で判定する
- 元の技のメッセージは `Used <技> but it was bounced back (<マジックコート|マジックミラー>)! <はね返した技のメッセージ>`（outcome は `failed`）
- マジックコートの技は `tryApplyVolatile(attacker, 'magicCoat', { magicCoat: true }, ctx)` を書くだけ（ターン終了時にエンジンが消す）

```ts
export class MagicBounceEffect implements IAbilityEffect {
  readonly bouncesMoves = true;
}
```

### 13.7 近似と注意

- 注: 出し続ける技（あばれるなど）は、まもる系に防がれると止まる（失敗として扱う）。本家は 1 ターン目に防がれたときだけ止まる
- 注: 技の `onMiss` は、命中判定で外れたときと、まもる系に防がれたときに呼ぶ。タイプ相性で無効化されたとき・特性の `preventsMove` などで失敗したときは呼ばない（とびひざげりがゴーストタイプに無効化されても自傷しない）
- 注: ふかしのこぶしは、本家と同じくトリックガードを通り抜けない（変化技で接触する技はない）
- 注: まもる系を続けて使ったときの成功の判定と、たたみがえし・まもる系の「最後に動くなら失敗」は、`Math.random` と `isLastToMove` で判定する（呼ばれた技でも同じ）
- 注: 決まったダメージを与える技（ちきゅうなげなど）を作るときは、本家と同じく急所にならないようにする必要がある（今のエンジンは、ダメージ計算をする攻撃技すべてで急所を引く）
- 注: ドラゴンエールは味方が要るので、シングルバトルでは失敗する（今は NoOpEffect）。`critStageBoost` を書く技は、今はきあいだめだけ
- バトルスイッチ（ギルガルドのフォルムチェンジ）は、特性の `onPrepareHit` で `changeForm` を呼んで作る（14.9）。攻撃技で `'blade'`、キングシールドで `'shield'`。実数値はエンジンが表の種族値で計算し直す
- どくどくの必中は使用者の実効のタイプ（みずびたしなどを反映）で判定する

### 13.8 特性・技ごとに使うもの

| 特性・技 | 使うもの |
| --- | --- |
| まもる・みきり | `protection = { kind: 'protect' }` |
| キングシールド | `protection = { kind: 'kingsShield' }`（攻撃技だけ防ぎ、接触で攻撃 -1）。ギルガルドのフォルムチェンジはバトルスイッチの `onPrepareHit`（14.9） |
| ニードルガード | `protection = { kind: 'spikyShield' }`（接触で 1/8） |
| トーチカ | `protection = { kind: 'banefulBunker' }`（接触でどく） |
| ブロッキング | `protection = { kind: 'obstruct' }`（接触で防御 -2） |
| スレッドトラップ | `protection = { kind: 'silkTrap' }`（接触で素早さ -1） |
| かえんのまもり | `protection = { kind: 'burningBulwark' }`（接触でやけど） |
| こらえる | `protection = { kind: 'endure' }` |
| ワイドガード | `protection = { side: 'wideGuard' }`（シングルバトルでも、じしんなど `spread` の技を防ぐ） |
| ファストガード | `protection = { side: 'quickGuard' }` |
| トリックガード | `protection = { side: 'craftyShield' }` |
| たたみがえし | `protection = { side: 'matBlock' }`（出てから最初の行動だけ） |
| マジックコート | `tryApplyVolatile(attacker, 'magicCoat', { magicCoat: true }, ctx)`（13.6） |
| マジックミラー | `bouncesMoves = true`（13.6） |
| きあいだめ | `tryApplyVolatile(attacker, 'focusEnergy', { critStageBoost: 2 }, ctx)`（13.1） |
| とぎすます | `applyVolatile(attacker, { laserFocusTurns: 2 }, ctx)`（13.1。もう一度使うと延びる） |
| カブトアーマー・シェルアーマー | `preventsCriticalHit = true`（13.1） |
| きょううん | `modifyCritRatio` で `stage + 1`（13.1） |
| ひとでなし | `modifyCritRatio` で、`ctx.defender` がどく・もうどくなら `3`（13.1） |
| いかりのつぼ | `onDamagingHit` で `hit.isCriticalHit && !hit.targetFainted` なら攻撃 +12（13.1） |
| スナイパー | 作成済み（`modifyDamageDealt` で `ctx.isCriticalHit` を見る。急所が出るようになったので効く） |
| ミラクルスキン | `modifyBaseAccuracy`（防御側で変化技なら 50。13.2） |
| ノーガード | `ensuresMoveHit = true`（乗せ換え済み。13.2） |
| ふかしのこぶし | `bypassesProtection`（接触技なら `true`。13.5） |
| きんしのちから | `breaksMoldFor`（変化技なら `true`。13.4）と `modifyFractionalPriority`（変化技なら -0.1。13.3） |

## 14. タイプ変更・フォルムチェンジ・特性の書き換えの仕組み

タイプ・特性・フォルム・へんしんの上書きは、`volatileState` / `persistentState` のキーに置きます（キーの一覧と消える場面は `docs/battle-state.md` の 5 章「上書き」と 6 章）。技・特性の実装では、次のことを守ります。

- 書くときは、この章の補助関数を使う。本家と同じ失敗の条件（消せない特性・アルセウスのタイプなど）と、いっしょに消すキーを補助関数が守る
- 読むときは、`TrainedPokemon` のタイプ・特性を直接読まず、実効の値を求める関数（14.1）を使う。エンジンは、タイプ一致・相性・タイプの免疫・設置技・天候のダメージ・特性のフックのすべてで実効の値を読む（`docs/battle-state.md` の 12 章）
- 補助関数は `pokemon/domain/battle-events/` に、特性のフラグ表・フォルムの表・実効の値を求める同期の関数は `battle/domain/logic/` にある。どれも特性のファイルから使っても循環参照にならない

### 14.1 実効の値を読む（resolveTypeNames / hasType / resolveAbilityName / resolveBattlePokemonTraits）

- シグネチャ: `resolveTypeNames(pokemon, ctx, options?): Promise<string[]>`、`hasType(pokemon, typeName, ctx, options?): Promise<boolean>`（`options` は `{ excludeAddedType?, ignoreRoost? }`。`excludeAddedType: true` で 3 つめのタイプを除く。本家の getTypes(true)）、`resolveBattlePokemonTraits(pokemon, deps, { trainedPokemon?, others? }): Promise<{ trainedPokemon, abilityName, typeNames, stats } | undefined>`、`resolveBattleAbilityName(pokemon, deps)`（`battle-traits.ts`）、`resolveAbilityName(pokemon, ctx)`（`ability-lookup.ts`）
- 同期の版（ドメイン層。エンジンが使う）: `battleTypeNamesOf(trainedPokemon, status)`・`battleAbilityNameOf(trainedPokemon, status, others)`・`battleStatsOf(trainedPokemon, status)`（`battle/domain/logic/battle-pokemon-traits.ts`）、`resolveEffectiveTypeNames`・`resolveEffectiveAbilityName`（`effective-traits.ts`）
- タイプ: `typeOverride` → フォルムのタイプ（14.6）→ もとのタイプ。はねやすめのターン（`roosting`）はひこうを除き、なくなればノーマル。最後に `addedType` を足す。タイプなしは `'???'`（`TYPELESS_TYPE_NAME`）で、どのタイプとも一致しない
- 特性: `abilityOverride` → もとの特性。へんしん中は `noTransform` の特性が効かない。消せない特性（`cantSuppress`）はいつも効く。`abilitySuppressed` と、場のほかのポケモンのかがくへんかガスで消える（undefined）
- 技の実行のコンテキストには、実効の値がもう入っている: `ctx.attackerAbilityName`・`ctx.defenderAbilityName`・`ctx.attackerTypeNames`・`ctx.defenderTypeNames`・`ctx.attackerStats`・`ctx.defenderStats`。同じ技の中で書き換えた値は、コンテキストには反映されない（読み直すなら `resolveTypeNames` などを使う）
- 使う技・特性: タイプを判定するすべての効果（もりののろい・ハロウィン・もえつきる・へんしょく・ミラータイプ など）、今の特性を判定するすべての効果

```ts
if (await hasType(defender, 'くさ', ctx)) return 'But it failed'; // もりののろい
const types = await resolveTypeNames(defender, ctx);                // ミラータイプで写すタイプ
const name = await resolveAbilityName(target, ctx);                 // いえきなら undefined
```

### 14.2 タイプを書き換える（setTypes / addType / findResistingTypeNames）

- シグネチャ: `setTypes(target, typeNames, ctx): Promise<boolean>`、`addType(target, typeName, ctx): Promise<boolean>`、`findResistingTypeNames(attackTypeName, ctx): Promise<string[]>`、定数 `ALL_TYPE_NAMES`・`TYPELESS_TYPE_NAME`（`type-change.ts`・`effective-traits.ts`）
- `setTypes`: `typeOverride` を書き、`addedType` を消す（本家の setType）。ひんし・アルセウス（493）・シルヴァディ（773）なら false。「すでにそのタイプなら失敗」は呼ぶ側で判定する
- `addType`: `addedType` を書く（前に足したタイプは置き換える）。ひんしなら false。「すでにそのタイプなら失敗」は呼ぶ側で `hasType` を見る
- `findResistingTypeNames`: 技のタイプを半減以下にする（相性 0 を含む）タイプを `ALL_TYPE_NAMES` の順に返す。使用者がすでに持つタイプを除くのは呼ぶ側
- もとのタイプに戻す（ぎたいでフィールドがなくなったとき）は `patchVolatileState(id, { typeOverride: null })`
- 使う技・特性: みずびたし（`['みず']`）・まほうのこな（`['エスパー']`）・テクスチャー（1 つめの欄の技のタイプ。`resolveMoveSlots` と `moveRepository`）・テクスチャー２（相手の `lastMoveTypeName` を `findResistingTypeNames` に渡し、ランダムに 1 つ）・ミラータイプ（相手の `resolveTypeNames(defender, ctx, { excludeAddedType: true })` から `'???'` を除く。なければ相手に `addedType` があればノーマル、なければ失敗。相手の `addedType` も写す）・ほごしょく（`battle.field` で エレキ→でんき・グラス→くさ・ミスト→フェアリー・サイコ→エスパー・なし→ノーマル）・もえつきる・でんこうそうげき（`resolveTypeNames(attacker, ctx, { excludeAddedType: true })` のほのお・でんきを `TYPELESS_TYPE_NAME` に変えて `setTypes`）・へんしょく・へんげんじざい・リベロ・ぎたい・ハロウィン（`addType(target, 'ゴースト')`）・もりののろい（`addType(target, 'くさ')`）

```ts
const types = await resolveTypeNames(defender, ctx);
if (types.join() === 'みず' || !(await setTypes(defender, ['みず'], ctx))) return 'But it failed';
return 'transformed into the Water type!'; // みずびたし
```

### 14.3 技のタイプを変える（modifyMoveType の順・プラズマシャワー・そうでん・lastMoveTypeName）

- 技のタイプは、エンジンが次の順で決める（本家の onModifyType の順。`MoveExecutorService.resolveMoveTypeName`）
  1. 技の `modifyMoveType`（ウェザーボール・オーラぐるまなど）
  2. 攻撃側特性の `modifyMoveType`（-スキン・ノーマルスキン・うるおいボイス）
  3. `GlobalFieldState.ionDeluge`（プラズマシャワー）: ノーマル技をでんき技にする（変化技も）
  4. 使用者の `volatileState.electrified`（そうでん）: どのタイプの技もでんき技にする（わるあがきを除く）
- 決まったタイプが、タイプ一致・タイプ相性・天候補正・ふんじん・ゲンシ天候の判定・`hit.moveTypeName`・`ctx.moveTypeName` に使われる。-スキン系・ノーマルスキンの 1.2 倍は、`modifyBasePower` で `ctx.moveTypeChangedByAbility === true` のときだけ掛ける（攻撃側特性の `modifyMoveType` が undefined 以外を返したときに、エンジンが true にする。本家の `typeChangerBoosted`）。プラズマシャワー・そうでんでさらに変わっても 1.2 倍のまま。技が先にタイプを変えた（晴れ・雨のウェザーボールなど）ときや、プラズマシャワー・そうでんだけで変わったときは false。`ctx.baseMoveTypeName` で判定しない（これらの技まで 1.2 倍になる）
- `lastMoveTypeName`: 技を出した記録（`recordMoveUse`）のとき、決まったタイプを書く（エンジンが書く。呼ばれた技でも、呼ばれた技のタイプを書く（本家の lastMoveUsed）。タイプなしの技なら消す。みらいよちが当たるときは書かない）
- 使う技・特性: プラズマシャワー（`patchGlobalFieldState(battle.id, { ionDeluge: true })`。ターン終了時に消える）、そうでん（相手がこのターンにまだ行動していない（`ctx.defenderPendingMoveId !== undefined`）か、このターンに交代で出た（`defender.volatileState.switchedInTurn === ctx.battle.turn`。本家の activeTurns が 0）なら `patchVolatileState(defender.id, { electrified: true })`、どちらでもなければ失敗）、ノーマルスキン（すべての技を `'ノーマル'` に。もとからノーマル技でも `'ノーマル'` を返すので 1.2 倍になる。ウェザーボール・テクノバスター・さばきのつぶて・マルチアタック・めざめるダンス・しぜんのめぐみ・だいちのはどう・めざめるパワーは変えない）、フェアリースキン・フリーズスキン・スカイスキン・エレキスキン（ノーマル技だけ変える。同じく、ウェザーボール・テクノバスター・さばきのつぶて・マルチアタック・めざめるダンス・しぜんのめぐみ・だいちのはどうは変えない）

```ts
modifyMoveType(_p: BattlePokemonStatus, typeName: string): string | undefined {
  return typeName === 'ノーマル' ? 'こおり' : undefined; // フリーズスキン
}
modifyBasePower(_p: BattlePokemonStatus, power: number, ctx?: BattleContext): number | undefined {
  return ctx?.moveTypeChangedByAbility === true ? modifyByFixedPoint(power, 4915) : undefined; // 1.2 倍
}
```

### 14.4 特性を書き換える（setAbility / swapAbilities / suppressAbility / resolveCurrentAbilityName / hasAbilityFlag）

- シグネチャ: `setAbility(target, abilityName, ctx): Promise<{ changed, previousAbilityName? }>`、`swapAbilities(source, target, ctx): Promise<boolean>`、`suppressAbility(target, ctx): Promise<boolean>`、`resolveCurrentAbilityName(pokemon, ctx): Promise<string | undefined>`（`ability-change.ts`）、`hasAbilityFlag(abilityName, flag)`・`ABILITY_FLAGS`（`battle/domain/logic/ability-flags.ts`）
- フラグ（Showdown の flags と同じ）: `cantSuppress`（消せない・書き換えられない）・`failRolePlay`（なりきり・うつしえで写せない）・`noReceiver`・`noEntrain`（なかまづくりで写せない）・`noTrace`・`failSkillSwap`（スキルスワップ・さまようたましいで入れ替えられない）・`noTransform`（へんしん中は効かない）
- `setAbility`: `abilityOverride` を書き、新しい特性が効いていれば `onEntry` を呼ぶ（本家の Start。受け取ったいかくが発動する）。場に出たときだけ動く特性（`SWITCH_IN_ONLY_ABILITY_NAMES`: かわりもの・イリュージョン・テラスチェンジ。本家の onSwitchIn）は呼ばない（スキルスワップで受け取ったかわりものはへんしんしない）。ひんし・新しい特性か今の特性が `cantSuppress` なら `{ changed: false }`
- `swapAbilities`: 両方の今の特性を入れ替え、それぞれの `onEntry` を呼ぶ。ひんし・どちらかが `failSkillSwap` なら false。第 9 世代は同じ特性どうしでも入れ替えられる
- `suppressAbility`: `abilitySuppressed` を書く。ひんし・`cantSuppress`・すでに消されているなら false
- `resolveCurrentAbilityName`: 今の特性名（消されているかは見ない。本家の `pokemon.ability`）。なりきり・スキルスワップで写す特性や、ミイラで上書きできるかに使う
- 技ごとの失敗（なりきりで同じ特性・`failRolePlay`、なかまづくりの `noEntrain`、なやみのタネのふみん・なまけ、シンプルビームのたんじゅん・なまけ）は呼ぶ側で判定する
- 使う技・特性: スキルスワップ・さまようたましい（`swapAbilities`。さまようたましいは `onDamagingHit` で `hit.isContact` のとき）、なりきり（使用者に相手の特性）・なかまづくり（相手に使用者の特性）・なやみのタネ（ふみん。ねむっていれば起こす）・シンプルビーム（たんじゅん）・うつしえ（使用者に相手の特性）・トレース（`onEntry` で相手の特性。`noTrace` なら写さない）・ミイラ・とれないにおい（`onDamagingHit` で接触した相手に。相手が `cantSuppress` か同じ特性なら何もしない）、いえき（`suppressAbility`）・コアパニッシャー（相手がもう行動していて、このターンに交代で出たのでなければ `suppressAbility`。本家の newlySwitched）

```ts
const name = await resolveCurrentAbilityName(defender, ctx);
if (!name || name === (await resolveCurrentAbilityName(attacker, ctx)) || hasAbilityFlag(name, 'failRolePlay')) return 'But it failed';
return (await setAbility(attacker, name, ctx)).changed ? `copied ${name}!` : 'But it failed'; // なりきり
```

### 14.5 かがくへんかガス（エンジンが判定する）

- 特性名が `'かがくへんかガス'`（`NEUTRALIZING_GAS_ABILITY_NAME`）のポケモンが場にいて、ひんし・いえき・へんしん中でなければ、ほかの場のポケモンの特性は効かない（実効の特性が undefined になる。消せない特性とかがくへんかガス自身は残る）。エンジンが実効の特性を求めるときに判定するので、特性の効果は要らない（`AbilityRegistry` に登録しなくても効く）
- 場に出たときのメッセージを出したいときだけ、`onEntry` を持つ効果を登録する
- バトル開始時は、かがくへんかガスの先発の `onEntry` を先に呼ぶ（本家の onSwitchInPriority 2）。相手の先発の特性は消えているので、ゲンシ天候・いかくなどは始まらない
- ゲンシ天候を出したポケモンの特性が消えたら、エンジンが行動のあとに天候を終わらせる（`PrimalWeatherReleaser.releaseIfAbilityLost`）
- 注: かがくへんかガスが場を離れたとき、ほかのポケモンの特性の `onEntry` を呼び直さない（本家は呼び直すので、いかくが発動する）。場に出たときに、相手のイリュージョンを解かない

```ts
// 特性の効果は要らない。場にいるだけで、相手の resolveAbilityName は undefined になる
const name = await resolveAbilityName(opponent, ctx); // undefined
```

### 14.6 フォルムを変える（changeForm / POKEMON_FORMS）

- シグネチャ: `changeForm(holder, form | null, ctx, { persistent? }): Promise<boolean>`（`form-change.ts`）、`findPokemonForm(nationalDex, form)`・`POKEMON_FORMS`（`battle/domain/logic/pokemon-forms.ts`）
- `volatileState.form`（`persistent: true` なら `persistentState.form`）に書く。`null` で消す（もとのフォルムに戻す）。タイプと実数値は、エンジンが読むときに表のフォルムの値で求める。本家の setSpecies と同じく `typeOverride`・`addedType`・`statOverrides` を消す。HP の種族値が変わるフォルム（ジガルデのパーフェクトフォルム）は、最大 HP を変え、減った HP を保つ
- ひんし・へんしん中・すでにそのフォルムなら false
- 特性は、交代しても残るフォルム（`persistent: true`）が表の `abilityName` を持つときだけ変わる（テラパゴスのテラスタルフォルムのテラスシェル。本家の永続の formeChange が baseAbility を書き換える）。そのときは `abilityOverride` も消す。実効の特性・`resolveCurrentAbilityName` は、そのフォルムの特性をもとの特性として読む（`baseAbilityNameOf`）。ほかのフォルムでは特性は変えない
- 表のフォルム名: ギルガルド 681（`'shield'`・`'blade'`）、ヒヒダルマ 555（`'standard'`・`'zen'`・`'galar-standard'`・`'galar-zen'`）、メテノ 774（`'core'`・`'meteor'`）、ヨワシ 746（`'solo'`・`'school'`）、ミミッキュ 778（`'disguised'`・`'busted'`）、コオリッポ 875（`'ice'`・`'noice'`）、モルペコ 877（`'full-belly'`・`'hangry'`）、ジガルデ 718（`'50'`・`'10'`・`'complete'`）、ウッウ 845（`'gulping'`・`'gorging'`）、ポワルン 351（`'normal'`・`'sunny'`・`'rainy'`・`'snowy'`）、チェリム 421（`'overcast'`・`'sunshine'`）、イルカマン 964（`'zero'`・`'hero'`）、テラパゴス 1024（`'normal'`・`'terastal'`。テラスタルフォルムの特性はテラスシェル）
- ポケモンの種類は `TrainedPokemon.pokemon.nationalDex` で判定する（DB は全国図鑑の番号ごとに 1 行。`docs/battle-state.md` の 12 章の注）
- フォルムを書いていない（`null` で戻した）ポケモンは、表の既定のフォルム（`isDefault`: ギルガルド `'shield'`・ヒヒダルマ `'standard'`・メテノ `'meteor'`・ヨワシ `'solo'`・ミミッキュ `'disguised'`・コオリッポ `'ice'`・モルペコ `'full-belly'`・ジガルデ `'50'`・ポワルン `'normal'`・チェリム `'overcast'`・イルカマン `'zero'`）のタイプと種族値になる。バトル開始時の最大 HP も既定のフォルムで計算する
- 使う特性: バトルスイッチ（`onPrepareHit`。14.9）・ダルマモード（`onTurnEnd` で HP が半分以下なら `'zen'`、半分より上なら `null`。ガラルのすがたは DB にない（全国図鑑の番号ごとに既定のすがただけ）ので、`'galar-zen'` は使わない）・リミットシールド（`onEntry`・`onTurnEnd` で HP が半分以下なら `'core'`、半分より上なら `null`（既定のりゅうせいのすがた）。りゅうせいのすがた（`form` が `'core'` でない）の間は `canReceiveStatusCondition` と `canReceiveVolatile`（あくび）で防ぐ）・ぎょぐん（レベル 20 以上で、`onEntry`・`onTurnEnd` で HP が 1/4 より上なら `'school'`、以下なら `null`（既定のたんどくのすがた））・ばけのかわ（14.10）・アイスフェイス（14.10・14.11）・はらぺこスイッチ（`onTurnEnd` で `'hangry'` と `null` を交互に。オーラぐるまの `modifyMoveType` が `volatileState.form` を見る）・スワームチェンジ（`onTurnEnd` で半分以下なら `persistent` の `'complete'`）・うのミサイル（14.9）・てんきや・フラワーギフト（14.11）・マイティチェンジ（`onSwitchOut` で `persistent` の `'hero'`）・テラスチェンジ（`onEntry` で `persistent` の `'terastal'`。HP の種族値が 90 → 95 になり、特性がテラスシェルになる）

```ts
if (ctx && holder.currentHp > 0 && holder.currentHp <= holder.maxHp / 2) {
  await changeForm(holder, 'complete', ctx, { persistent: true }); // スワームチェンジ（onTurnEnd の中）
}
```

### 14.7 へんしん（transformInto）

- シグネチャ: `transformInto(user, target, ctx): Promise<boolean>`（`transform.ts`）
- 使用者に書くもの: `transformedIntoStatusId`、`typeOverride`（相手のタイプ。はねやすめで失ったひこうも写す）と `addedType`、`statOverrides`（相手の HP 以外の実数値）、`abilityOverride`（相手の今の特性）、`moveSlotOverrides`（相手の技。PP と最大 PP は 5、もとが 5 未満ならその値）、`critStageBoost`・`laserFocusTurns`、能力ランク 7 つ。写した特性が効いていれば `onEntry` を呼ぶ。ただし、使用者の今の特性と同じ特性を写したとき（本家の setAbility の isTransform）と、場に出たときだけ動く特性は呼ばない
- へんしん中は、技の欄が `moveSlotOverrides` だけになり（欄の数も相手と同じ）、自分のフォルムを見ない。交代で元に戻る
- どちらかがひんし・どちらかがへんしん中・相手がみがわり中・どちらかがイリュージョンで化けているなら false
- 使う技・特性: へんしん（`onUse`）、かわりもの（`onEntry` で相手の場のポケモンに）

```ts
async onUse(attacker: BattlePokemonStatus, defender: BattlePokemonStatus, ctx: BattleContext) {
  return (await transformInto(attacker, defender, ctx)) ? 'transformed!' : 'But it failed'; // へんしん
}
```

### 14.8 イリュージョン（findIllusionTarget / illusionStatusId）

- シグネチャ: `findIllusionTarget(statuses, holder): BattlePokemonStatus | undefined`（`illusion.ts`）
- 化ける先: 同じトレーナーの手持ちを ID の大きい方から見て、自分より後ろにいる、ひんしでない最初のポケモン（本家の onBeforeSwitchIn）。自分が最後なら化けない
- 特性の `onEntry` で `illusionStatusId` を書き、`onDamagingHit` で消す（ダメージを受けたら解ける）。特性を書き換える・消すと補助関数が消す。へんしんはイリュージョンの相手・使用者に失敗する
- 注: API はポケモンの名前・見た目を返さないので、化けた先を見せることはできない（`docs/battle-state.md` の 8 章）

```ts
const statuses = await ctx.battleRepository!.findBattlePokemonStatusByBattleId(holder.battleId);
const target = findIllusionTarget(statuses, holder);
if (target) await ctx.battleRepository!.patchVolatileState(holder.id, { illusionStatusId: target.id });
```

### 14.9 onPrepareHit（特性、攻撃側）

- シグネチャ: `onPrepareHit?(holder, target, ctx?): Promise<string | null>`
- 呼ばれる場所: `MoveExecutorService.runMoveBody`。特性の `preventsMove` を通ったあと、サイコフィールド・まもる系・命中判定の前に 1 回（本家の onPrepareHit。変化技・外れる技でも呼ぶ）。`ctx.moveTypeName` はタイプを変える効果のあとのタイプ。はね返した技・みらいよちが当たるとき・よこどりで奪った技・技を呼ぶ技（ゆびをふる・ねごと・ねこのて・まねっこ・オウムがえし・さきどり・しぜんのちから）では呼ばない（呼ばれた技では呼ぶ）
- 呼んだあと、エンジンは使用者を読み直し、タイプ・実数値・特性を求め直してから技を続ける。返したメッセージは技のメッセージの前に付く
- 使う特性: へんげんじざい・リベロ（`typeChangeAbilityUsed` がなく、タイプなしの技でなく、今のタイプが技のタイプだけでなければ `setTypes` と `typeChangeAbilityUsed: true`）、バトルスイッチ（攻撃技で `'blade'`、キングシールドで `'shield'`。へんしん中は何もしない）
- うのミサイルは onPrepareHit を使わない（本家は技が当たる直前・ため技の 1 ターン目に変わる）。なみのりは攻撃側の `onSourceDamagingHit`（ヒットのあと）で、ダイビングは技の効果の `chargeTurn.onCharge`（ため技の 1 ターン目。本家の Dive の onTryMove）で、使用者の実効の特性（`ctx.attackerAbilityName`）がうのミサイル・ウッウ（845）・へんしん中でなければ、HP が半分より上なら `'gulping'`、以下なら `'gorging'` にする。注: 本家のなみのりは onSourceTryPrimaryHit（命中・まもる系のあと、ダメージの前）で変わる。ダメージを与えなかったヒットでは、ここでは変わらない
- onPrepareHit は、技の `failsOnTryMove`（もえつきる・でんこうそうげき。本家の onTryMove）で失敗した技・ため技の 1 ターン目では呼ばない

```ts
const type = ctx?.moveTypeName;
if (!ctx || !type || type === TYPELESS_TYPE_NAME || holder.volatileState.typeChangeAbilityUsed || (await resolveTypeNames(holder, ctx)).join() === type || !(await setTypes(holder, [type], ctx))) return null;
await ctx.battleRepository?.patchVolatileState(holder.id, { typeChangeAbilityUsed: true });
return `became the ${type} type!`; // へんげんじざい（onPrepareHit の中）
```

### 14.10 blockDamagingHit（特性、防御側）

- シグネチャ: `blockDamagingHit?(holder, attacker, ctx?): Promise<string | null>`
- 呼ばれる場所: `MoveExecutorService` のヒットのループ。ダメージ技のヒットごとに、ダメージを与える前（みがわりに当たるヒットでは呼ばない）。かたやぶりで無視される
- メッセージを返すと、そのヒットのダメージを 0 にする（本家の onDamage が 0 を返す）。防いだヒットも当たったものとして、技の `onHit`（追加効果）・接触時の特性・`onDamagingHit`（`hit.damage` は 0）・とんぼがえりの交代が起きる。急所にはならない。連続技は次のヒットに進む
- 防いだ状態・フォルム・自分へのダメージは、このフックの中で書く
- 使う特性: ばけのかわ（`disguiseBusted` がなく、へんしん中でなければ防ぎ、`disguiseBusted: true`、`persistent` の `'busted'`、最大 HP の 1/8 の技以外のダメージ）、アイスフェイス（物理技だけ。`iceFaceBroken` がなければ防ぎ、`iceFaceBroken: true`、`persistent` の `'noice'`）

```ts
if (!ctx || holder.persistentState.disguiseBusted || holder.volatileState.transformedIntoStatusId) return null;
await ctx.battleRepository?.patchPersistentState(holder.id, { disguiseBusted: true });
await changeForm(holder, 'busted', ctx, { persistent: true });
await applyIndirectDamage(holder, fractionOfMaxHp(holder, 8), ctx);
return 'Its disguise served it as a decoy!'; // ばけのかわ（blockDamagingHit の中）
```

### 14.11 onWeatherChange / onTerrainChange（特性、場の全員）と notifyFieldChange

- シグネチャ: `onWeatherChange?(holder, ctx?): Promise<void>`、`onTerrainChange?(holder, ctx?): Promise<void>`、`notifyFieldChange(ctx, 'weather' | 'terrain'): Promise<void>`（`field-change.ts`）
- 呼ばれる場所: `setWeather`・`setPrimalWeather`・`setTerrain` で変えたあと、`clearTerrain`（きりばらい・はがねのローラー・アイススピナー）で消したあと、天候・フィールドがターン終了時に終わったあと（`FieldResidualProcessor`）、ゲンシ天候が終わったあと（`PrimalWeatherReleaser`）。場のひんしでないポケモンの実効の特性ごとに、ID の順に呼ぶ。`ctx.battle` は読み直した最新のもの、`ctx.weather` は効果のある天候（ノーてんき・エアロックが場にいれば None）、`ctx.field` は今のフィールド
- 場に出たときは呼ばないので、`onEntry` でも同じ判定をする。メッセージは出せない
- 使う特性: てんきや（晴れ→`'sunny'`、雨→`'rainy'`、あられ（ゆきの代わり）→`'snowy'`、ほか→`null`。へんしん中は何もしない）、フラワーギフト（晴れなら `'sunshine'`、ほか→`null`。攻撃・特防 1.5 倍は `modifyDamageDealt`・`modifyDamage` で近似する）、アイスフェイス（あられの間、`iceFaceBroken` なら消して `persistent` のフォルムを `null` に）、ぎたい（`onTerrainChange` でフィールドのタイプに `setTypes`、フィールドがなければ `typeOverride: null`）
- フィールドを消す技・特性は、`Battle.field` を直接書かず `clearTerrain(ctx): Promise<boolean>`（`field-state.ts`）を使う
- 注: ノーてんき・エアロックが場に出入りしたときは呼ばない

```ts
const weather = ctx?.weather;
const form = weather === Weather.Sun ? 'sunny' : weather === Weather.Rain ? 'rainy' : weather === Weather.Hail ? 'snowy' : null;
if (ctx) await changeForm(holder, form, ctx); // てんきや（onWeatherChange と onEntry の中）
```

### 14.12 近似と注意

- 注: `setAbility` は、書き換える前の特性の終わり（本家の End）を呼ばない。ゲンシ天候だけは、エンジンが行動のあとに終わらせる（`releaseIfAbilityLost`）
- 注: かがくへんかガスが場を離れても、ほかの特性の `onEntry` を呼び直さない（14.5）
- 注: ばけのかわは、本家ではこんらんの自傷も防ぐが、ここでは技のヒットだけを防ぐ（こんらんの自傷は特性のフックを呼ばない）
- 注: ぎたいの状態でみずびたしを受け、そのあとフィールドが終わったとき、本家はもとのタイプに戻すが、`typeOverride: null` で戻すかは特性の実装しだい
- 注: へんしんは重さ・性別を写さない。写した相手に特性がないときは、使用者のもとの特性が残る
- 注: レシーバー・かがくのちから（味方がひんしになったとき）としれいとう（ダブルバトル）は、シングルバトルでは何もしない
- 注: テラスタル（テラスシェルの効果に使うフック・ゼロフォーミングのテラスタルの部分・テラパゴスのステラフォルム）は扱わない。テラスチェンジのフォルムチェンジは扱う（14.6）

### 14.13 特性・技ごとに使うもの

| 特性・技 | 使うもの |
| --- | --- |
| スキルスワップ | `swapAbilities(attacker, defender, ctx)`（14.4） |
| なりきり | 相手の `resolveCurrentAbilityName`（同じ特性・`failRolePlay`・使用者が `cantSuppress` なら失敗）→ `setAbility(attacker, name, ctx)` |
| なかまづくり | 使用者の今の特性（`noEntrain` なら失敗）を、相手に `setAbility`（相手が同じ特性・`cantSuppress`・なまけなら失敗） |
| なやみのタネ | 相手がふみん・なまけなら失敗。`setAbility(defender, 'ふみん', ctx)`、ねむっていれば治す |
| シンプルビーム | 相手がたんじゅん・なまけなら失敗。`setAbility(defender, 'たんじゅん', ctx)` |
| いえき | `suppressAbility(defender, ctx)`（14.4） |
| コアパニッシャー | ダメージのあと、`ctx.defenderPendingMoveId` がなく（相手がもう行動した）、`defender.volatileState.switchedInTurn !== ctx.battle.turn`（このターンに交代で出たのではない）なら `suppressAbility`。このターンに交代で出た相手は消さない（本家の newlySwitched） |
| うつしえ | 相手の今の特性（`failRolePlay` なら失敗）を `setAbility(attacker, ...)`。シングルバトルでは味方がいない |
| トレース | `onEntry` で相手の今の特性（`noTrace` でなければ）を `setAbility` |
| ミイラ・とれないにおい | `onDamagingHit` で `hit.isContact` なら、相手が `cantSuppress` か同じ特性でなければ `setAbility(attacker, '<自分の特性名>', ctx)` |
| さまようたましい | `onDamagingHit` で `hit.isContact` なら `swapAbilities(holder, attacker, ctx)` |
| かがくへんかガス | 要らない（エンジンが判定する。14.5） |
| レシーバー・かがくのちから・しれいとう | シングルバトルでは何もしない（14.12） |
| みずびたし・まほうのこな | `setTypes(defender, ['みず'] / ['エスパー'], ctx)`（すでにそのタイプだけなら失敗） |
| テクスチャー | 1 つめの欄の技のタイプ（持っていれば失敗）を `setTypes(attacker, [type], ctx)` |
| テクスチャー２ | 相手の `lastMoveTypeName`（なければ失敗）を `findResistingTypeNames` に渡し、使用者が持つタイプを除いてランダムに `setTypes` |
| ミラータイプ | 相手の `resolveTypeNames(defender, ctx, { excludeAddedType: true })`（`'???'` を除く）を `setTypes(attacker, ...)`、相手の `addedType` も書く |
| ほごしょく | `battle.field` のタイプで `setTypes(attacker, ...)` |
| もえつきる・でんこうそうげき | `failsOnTryMove`（`ctx.attackerTypeNames` にほのお・でんきがなければ失敗。本家の onTryMove なので、へんげんじざい・リベロより先に判定する）と `afterDamage` で、`resolveTypeNames(attacker, ctx, { excludeAddedType: true })` のそのタイプを `TYPELESS_TYPE_NAME` に変えて `setTypes` |
| はねやすめ | 回復と `patchVolatileState(attacker.id, { roosting: true })`。ひこうを失うのはエンジン |
| ハロウィン・もりののろい | `hasType` で持っていれば失敗、`addType(defender, 'ゴースト' / 'くさ', ctx)` |
| プラズマシャワー | `patchGlobalFieldState(battle.id, { ionDeluge: true })`（14.3） |
| そうでん | 相手がまだ行動していないか、このターンに交代で出たなら `electrified: true`（14.3） |
| へんしょく | `onAfterMoveHit` で、ひんしでなく、`hit.moveTypeName` を持っていなければ `setTypes(holder, [type], ctx)` |
| へんげんじざい・リベロ | `onPrepareHit`（14.9） |
| ぎたい | `onEntry`・`onTerrainChange`（14.11） |
| ノーマルスキン・フェアリースキン・フリーズスキン・スカイスキン・エレキスキン | `modifyMoveType`（14.3）と `modifyBasePower`（`ctx.moveTypeChangedByAbility` なら 1.2 倍） |
| へんしん・かわりもの | `transformInto`（14.7） |
| イリュージョン | `onEntry` で `findIllusionTarget`、`onDamagingHit` で `illusionStatusId: null`（14.8） |
| バトルスイッチ | `onPrepareHit` と `changeForm`（14.9） |
| うのミサイル | なみのりは `onSourceDamagingHit`、ダイビングはダイビングの `chargeTurn.onCharge` で `changeForm`（14.9）。反撃は `onDamagingHit` |
| ダルマモード・リミットシールド・ぎょぐん・はらぺこスイッチ・スワームチェンジ | `onTurnEnd`（と `onEntry`）で `changeForm`（14.6） |
| ばけのかわ・アイスフェイス | `blockDamagingHit`（14.10）。アイスフェイスの復活は `onWeatherChange`・`onEntry`（14.11） |
| てんきや・フラワーギフト | `onEntry`・`onWeatherChange` で `changeForm`（14.11） |
| きずなへんげ | `onKnockOut` で `oncePerBattleAbilityUsed` がなければ、攻撃・特攻・素早さ +1（第 9 世代はフォルムを変えない） |
| マイティチェンジ | `onSwitchOut` で `changeForm(holder, 'hero', ctx, { persistent: true })` |
| テラスチェンジ | `onEntry` で、テラパゴス（1024）でへんしん中でなければ `changeForm(holder, 'terastal', ctx, { persistent: true })`。特性はテラスシェルになる（14.6） |
