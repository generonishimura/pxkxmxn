# バトルエンジンのフック一覧

技・特性の効果を実装するときに使うフックとコンテキストの一覧です。
この文書だけを見て実装できるように、呼ばれる場所と例を書いています。

- 特性のフック: `src/modules/pokemon/domain/abilities/ability-effect.interface.ts`（`IAbilityEffect`）
- 技のフック: `src/modules/pokemon/domain/moves/move-effect.interface.ts`（`IMoveEffect`）
- コンテキスト: `src/modules/pokemon/domain/abilities/battle-context.interface.ts`（`BattleContext`）
- イベントの型と補助関数: `src/modules/pokemon/domain/battle-events/`（ヒットの情報・原因・能力ランク・状態異常・技以外のダメージ・吸収）

## 1. 技を使ったときの処理の順番

`MoveExecutorService.executeMove`（`src/modules/battle/application/services/move-executor.service.ts`）は次の順で処理します。

1. ヒット共通のコンテキストを作る（技名・技フラグ・効果のある天候・実数値・無視するランク・`effectivePriority`）
2. 両者の特性の `preventsMove` で技を失敗させるか判定する（変化技も含む。防御側はかたやぶりで無視）。失敗ならPPだけ減って `Used <技> but it failed (<特性名>)`
3. 防御側特性の `isImmuneToMove` で技そのものを無効にするか判定する（変化技も含む）。無効なら防御側特性の `onMoveBlocked` を呼んで終わり
4. 技の `shouldFail` で技が失敗するか判定する。失敗ならPPだけ減って `Used <技> but it failed`
5. 命中判定（`AccuracyCalculator.checkHit`）
6. 変化技なら `onUse` を呼んで終わり（威力が null で `modifyMovePower` もない攻撃技も、今までどおりここで終わる）
7. 技のタイプを決める（技の `modifyMoveType` → 攻撃側特性の `modifyMoveType`）。技全体のタイプ相性を `moveTypeEffectiveness` に入れる
8. 技の `beforeDamage`（連続技の回数決定）。このあと攻撃側・防御側の状態を取り直す
9. 技の威力を決める（技の `modifyMovePower`）
10. ヒットごとにダメージを計算して当てる（連続技・おやこあいの追加ヒット）。1以上減らしたヒットごとに、防御側特性の `onDamagingHit` → 攻撃側特性の `onSourceDamagingHit` を呼ぶ。どちらも呼んだあとに両者の状態を取り直すので、`onSourceDamagingHit` には `onDamagingHit` で変わったあとの状態が渡る。ダメージ0・どちらかがひんしで止まる
11. 接触時の特性（`applyContactStatusCondition`）→ 技の `onHit` → 技の `afterDamage`（実際に減らしたHPの合計）
12. 防御側特性の `onAfterMoveHit`（合計ダメージが1以上のとき）→ 相手がひんしで自分が無事なら攻撃側特性の `onKnockOut`

メッセージは `Used <技> and dealt <ダメージ> damage (hit N times) <接触時の特性> <10のメッセージ> <onHit・afterDamage> <12のメッセージ>` の順に並びます。

ターン終了時（`StatusConditionProcessorService.processTurnEndAbilities`）は、場のポケモンごとに次の順で処理します。

1. ねむり: `shouldClearSleep(count, sleepTurnMultiplier)` で目を覚ますか判定する
2. どく・もうどく・やけど: ダメージを特性の `modifyStatusDamage` で変え、`applyIndirectDamage` で与える
3. 特性の `onTurnEnd`（コンテキストに `trainedPokemonRepository` が入る）

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
  const status = defender.statusCondition;
  const poisoned = status === StatusCondition.Poison || status === StatusCondition.BadPoison;
  return poisoned ? 130 : undefined;
}
```

- `StatusCondition` にはひるみ（`Flinch`）・こんらん（`Confusion`）も入っています。たたりめ・からげんきのように「状態異常なら」と判定するときは、`statusCondition !== None` ではなく `isMajorStatus(status)` を使います。

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
- 使う特性: うるおいボイス、-スキン系（フェアリースキンなど）
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
- 使う特性: ぼうおん、ぼうだん、ぼうじん（粉技）、かぜのり（変化技の風技）
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
- 使う特性: じきゅうりょく、せいぎのこころ、びびり、みずがため、じょうききかん、ねつこうかん（攻撃+1の部分）、わたげ、すなはき、こぼれダネ、てつのトゲ・さめはだ（新しく作る場合）、ゆうばく・とびだすなかみ（ひんしになったとき）
- `holder` はダメージを反映した状態です。ここで変えたランクは次のヒットのダメージ計算に使われます。
- 本家で「かたやぶりで止まる」特性（ねつこうかんなど）は、`AbilityRegistry.isIgnoredByMoldBreaker(ctx.attackerAbilityName, '<自分の特性名>')` で自分で判定します。

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
- 使う特性: 既存の基底クラス `BaseContactStatusConditionEffect`（せいでんきなど）、`BaseContactRecoilDamageEffect`（さめはだ・ゆうばく）、`BaseContactStatChangeEffect`（ぬめぬめなど）
- てつのトゲは `BaseContactRecoilDamageEffect` を継承して `damageDivisor = 8` にするだけで作れます（ダメージは `applyIndirectDamage` で与えるので、攻撃側のマジックガードで防がれる）。

```ts
export class IronBarbsEffect extends BaseContactRecoilDamageEffect {
  protected readonly damageDivisor = 8;
}
```

### 状態異常のフック

| フック | シグネチャ | 呼ばれる場所 | 使う特性 |
| --- | --- | --- | --- |
| `canReceiveStatusCondition`（既存） | `(pokemon, status, ctx?, source?: EffectSource) => boolean \| undefined` | `canInflictStatus`。技で付与するときはかたやぶりで無視 | めんえき、じゅうなん など。`source` が入るようになった |
| `bypassesStatusTypeImmunity` | `(holder, status, ctx?) => boolean \| undefined` | `canInflictStatus`。対象がタイプで防ぐとき、付与元の特性として | ふしょく |
| `onStatusInflicted` | `(holder, status, source: EffectSource \| undefined, ctx?) => Promise<string \| null>` | `inflictStatus`。書き込んだあと、付与された側の特性として | シンクロ |
| `onInflictStatus` | `(holder, target, status, ctx?) => Promise<string \| null>` | `inflictStatus`。書き込んだあと、付与元の特性として（自分に付与したときは呼ばない） | どくくぐつ（7章: 今は作れない） |
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
- 連続技は `MoveRegistry` に登録済みです（2〜5回は `TwoToFiveHitEffect`、2回は `TwoHitEffect` など）。登録した回数は `move-registry.multi-hit.spec.ts` で本家の表と照合しています。

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
| `baseMoveTypeName` | 技本来のタイプ名（タイプ変更の前） | 技の実行・ダメージ計算 |
| `movePower` | 技の威力（`modifyMovePower` の反映後、特性補正の前） | 技の実行・ダメージ計算 |
| `movePriority` | 技の優先度（特性補正の前） | 技の実行・行動順 |
| `effectivePriority` | 攻撃側特性の `modifyPriority`（いたずらごころなど）を反映した優先度 | 技の実行（`preventsMove` 以降） |
| `attackerAbilityName` / `defenderAbilityName` | 攻撃側・防御側の特性名 | 技の実行・行動順・ダメージ計算 |
| `attacker` / `defender` | 攻撃側・防御側の最新の状態（ランク・HP・状態異常） | 技の実行・ダメージ計算。行動順では `attacker` が行動するポケモン |
| `attackerStats` / `defenderStats` | ランク補正前の実数値 | 技の実行・ダメージ計算。行動順では `attackerStats` が行動するポケモン |
| `typeEffectiveness` | このヒットのタイプ相性（0〜4） | ダメージ計算中の特性フック |
| `moveTypeEffectiveness` | 技全体のタイプ相性（0〜4）。防御側特性の `isImmuneToType` で無効なら0 | ダメージ技の `beforeDamage` 以降 |
| `weather` | 効果のある天候（ノーてんき等がいれば `None`） | 技の実行・行動順・ターン終了時・ダメージ計算 |
| `isLastToMove` | このターン最後に行動するか | 技の実行・ダメージ計算 |
| `hasRecoil` | 反動・外したときの自傷がある技か（技の `hasRecoil`） | 技の実行・ダメージ計算 |
| `multiHitCount` / `hitIndex` | 総ヒット数 / 何回目のヒットか（0始まり） | 技の実行・ダメージ計算 |
| `ignoredAttackerRanks` / `ignoredDefenderRanks` | 0として扱うランク | 技の実行・命中判定・ダメージ計算 |
| `secondaryEffectChanceMultiplier` / `secondaryEffectsSuppressed` | 追加効果の確率倍率 / 相手への追加効果の無効化 | ダメージ技の `beforeDamage` 以降・`onHit` |

### イベントの型（`pokemon/domain/battle-events/`）

| 型 | 項目 | 渡す場所 |
| --- | --- | --- |
| `HitResult`（`hit-result.ts`） | `damage`（実際に減らしたHP）、`hpBefore`（受ける前のHP）、`hitIndex`、`hitCount`、`isContact`、`moveTypeName`、`moveCategory`、`targetFainted` | `onDamagingHit`・`onSourceDamagingHit`（ヒットごと）、`onAfterMoveHit`（技全体: `damage` は合計、`hpBefore` は技の前） |
| `EffectSource`（`effect-source.ts`） | `pokemon`（起こしたポケモン。自分で起こしたら対象と同じ）、`abilityName`（そのポケモンの特性名）、`kind`（`'move'` / `'ability'` / `'other'`）、`name`（技名・特性名。例: `'いかく'`） | 状態異常と能力ランクのフックすべて。`kind === 'move'` で相手が起こしたときだけ、対象の特性がかたやぶりで無視される |
| `StatChange`（`stat-change.ts`） | `statType`、`rankChange` | 能力ランクのフック |
| `StatChangeResult`（`stat-change.ts`） | `applied`（実際に変わった量）、`reflected`（ミラーアーマーで返した量）、`messages`（反応した特性のメッセージ） | `applyStatChanges` の戻り値 |

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
| `resolveAbilityName(pokemon, ctx)` / `getAbilityEffect(name)` | `ability-lookup.ts` | ポケモンの特性名・特性の効果を引く（特性のファイルから使っても循環参照にならない） |

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

- 連続技・おやこあいでも、`onHit`（追加効果）と接触時の特性は1回だけです。
- `modifyBasePower` などの補正は順番に掛けます（ゲームは補正をまとめてから1回掛けるため、まれに1違うことがあります）。
- 行動順のコンテキストの `moveTypeName` は技本来のタイプです（うるおいボイスなどのタイプ変更は反映しません）。
- ほろびのうたは場全体の技なので、`isImmuneToMove` では止まりません。
- 混乱の自傷ダメージでは、特性のフック（`isImmuneToType`・`modifyBasePower`・`modifyAnyBasePower`・`modifyDamageDealt`・`modifyDamage`）を呼びません。本家と同じく、能力値とランクだけで決まります。
- ポケモンの重さのデータがないため、重さを使う効果（ヘヴィメタル、ライトメタル、けたぐり等）は実装できません。
- `onDamagingHit` / `onSourceDamagingHit` はヒットごとですが、`applyContactStatusCondition` と技の `onHit` は今までどおり技全体で1回です。
- 状態異常は1つの欄（`statusCondition`）に入るため、ひるみ・こんらんは状態異常と同時に持てません。あくしゅうのひるみも、相手が状態異常なら付与できません（ひるみ技と同じ）。
- 次の効果は `applyStatChanges` を通らず、ランクを直接書きます。たんじゅん・あまのじゃく・ミラーアーマー・びんじょうなどは効きません: はらだいこ、はいすいのじん、ソウルビート、みをけずる、つぼをつく、ナインエボルブースト、ブレイブチャージ、ほおばる、じばそうさ・ギアアップ（`BasePlusMinusSelfStatBoostEffect`）、たがやす・フラワーガード（`BaseGrassTypeStatBoostEffect`）、いばる・おだてる（`BaseConfuseWithStatBoostEffect`）、おきみやげ、どくのいと、ひっくりかえす、くろいきり・クリアスモッグ、じこあんじ、ガードスワップなどの入れ替え技、かそく・ムラっけ・まけんき・かちき・そうしょく・でんきエンジンなどの既存の特性。必要になったら `applyStatChanges` に乗せ換えます。
- `onOpponentStatChanged`（びんじょう）の「相手」は、相手が起こした変化ならその相手、技の実行中ならコンテキストの `attacker` / `defender` です。場に出たとき・ターン終了時に相手が自分で上げた変化（ふとうのつるぎなど）では呼ばれません。また本家は行動の終わりにまとめて写しますが、ここではすぐに写します。
- `onKnockOut` は「自分の技で相手をひんしにした」ときだけです。ソウルハートは本家では誰がひんしになっても発動しますが、ここでは自分の技で倒したときだけになります（反動・状態異常・さめはだで相手が倒れたときは発動しない）。
- 場に出たときの特性のコンテキスト（バトル開始時・交代時）には `trainedPokemonRepository` が入ります。いかくに対するクリアボディ・ばんけん・ミラーアーマーなどはこれで判定します。

### まだ作れない効果

| 効果 | 足りないもの |
| --- | --- |
| ふうりょくでんき | 「次のでんき技の威力2倍」を覚えておく状態（じゅうでん状態）がない。じゅうでん（`ChargeEffect`）は特防+1だけ |
| ヘヴィメタル、ライトメタル | ポケモンの重さのデータがない |
| かぜのりの「おいかぜで攻撃+1」 | おいかぜ（場の状態）がない。風技を無効にして攻撃+1にする部分は `isImmuneToMove` + `onMoveBlocked` で作れる |
| メガランチャーの「いやしのはどう」の回復量1.5倍 | 回復量を変えるフックがない。はどう技の威力1.5倍は `modifyBasePower` で作れる |
| こだいかっせい・クォークチャージの「ブーストエナジー」 | 持ち物の仕組みがない。晴れ・エレキフィールドで発動する部分は作れる |
| どくくぐつ | どくにした相手をこんらんにするが、状態異常とこんらんが同じ欄にあるため、こんらんを書くとどくが消える。`onInflictStatus` は呼ばれる |
| じんばいったい（ブリザポス） | きんちょうかん（相手がきのみを食べられない）に持ち物の仕組みがない。しろのいななきの部分は `onKnockOut` で作れる |
| ばんけんの「ふきとばし・ほえるで交代させられない」 | 強制交代の仕組みがない。いかくで攻撃が上がる部分は `modifyIncomingStatChange` で作れる |

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
| シンクロ | `onStatusInflicted` + `tryInflictStatus(source.pokemon, ...)`（やけど・まひ・どく・もうどくだけ） |
| ふしょく | `bypassesStatusTypeImmunity`（どく・もうどく） |
| どくくぐつ | `onInflictStatus`（7章: 今は作れない） |
| はやおき | `sleepTurnMultiplier = 2` |
| ポイズンヒール | `modifyStatusDamage`（どく・もうどくなら最大HPの1/8回復して0を返す） |
| マジックガード | `preventsIndirectDamage = true`（`preventsRecoil` も残す） |
| いしあたま | `preventsRecoil = true`（作成済み） |
| ヘドロえき | `reversesDrainHeal = true`（ちからをすいとるは `applyDrainHeal` で回復するので、HPが満タンでもダメージを受ける） |
| てつのトゲ | `BaseContactRecoilDamageEffect` を継承して `damageDivisor = 8` |
| たんじゅん・あまのじゃく | `modifyIncomingStatChange`（`change.rankChange * 2` / `-change.rankChange`） |
| ばんけん | `modifyIncomingStatChange`（`source?.name === 'いかく'` で攻撃の低下を `+1` に） |
| ミラーアーマー | `reflectsStatDrops = true` |
| びんじょう | `onOpponentStatChanged`（上がった分を `applyStatChanges` で写す。`source?.name === 'びんじょう'` なら何もしない） |
| びびり | `onDamagingHit`（むし・ゴースト・あくで素早さ+1）+ `onStatChanged`（`source?.name === 'いかく'` で素早さ+1） |
| せいぎのこころ・じきゅうりょく・みずがため・じょうききかん・わたげ・すなはき・こぼれダネ・ねつこうかん | `onDamagingHit`（タイプは `hit.moveTypeName`。わたげは攻撃側に `applyStatChanges`、すなはき・こぼれダネは天候・フィールドを書き込む） |
| いかりのこうら・ぎゃくじょう（作成済み） | `onAfterMoveHit`（`hit.hpBefore > maxHp / 2` かつ今のHPが半分以下。ぎゃくじょうは特攻+1を `applyStatChanges` で行う） |
| じしんかじょう・しろのいななき・くろのいななき・ビーストブースト・ソウルハート | `onKnockOut` |
