# バトルの状態（volatileState と sideState）

ターンをまたいで残す必要があるバトルの状態は、2 つの JSON 列に保存します。

- `BattlePokemonStatus.volatileState`: 場に出ている間だけ続く、ポケモンごとの状態（やどりぎのタネ・みがわり・ちょうはつなど）
- `Battle.sideState`: 陣営ごとの場の状態（リフレクター・まきびしなど）と、両陣営にかかる場の状態（トリックルームなど）

型はドメイン層にあります。Prisma には依存しません。

- `src/modules/battle/domain/state/volatile-state.ts`（`VolatileState`）
- `src/modules/battle/domain/state/side-state.ts`（`SideState` / `SideConditions` / `GlobalFieldState`）
- `src/modules/battle/domain/state/state-field-parser.ts`（JSON を読む部品と、更新の共通処理）

今はまだ、どの技・特性もこの状態を読み書きしていません。この文書は、これから技や特性を実装するときの置き場所を決めるためのものです。

## 1. 保存のしかた

| 列 | テーブル | 型 | 既定値 |
| --- | --- | --- | --- |
| `volatile_state` | `battle_pokemon_status` | `JSONB NOT NULL` | `'{}'` |
| `side_state` | `battles` | `JSONB NOT NULL` | `'{}'` |

マイグレーションは `prisma/migrations/20261006170653_add_battle_state_columns/` です。既定値が `{}` なので、前からある行もそのまま読めます。

読み書きは `BattlePrismaRepository` がします。

1. 読むとき: `parseVolatileState` / `parseSideState` で型付きの状態にする
2. 作るとき: 空の状態（`{}`）を書き込む
3. 更新するとき: `updateBattlePokemonStatus(id, { volatileState })` や `update(id, { sideState })` で渡したときだけ書き込む

## 2. 決まりごと

- すべてのキーは任意です。キーがないことは「その状態ではない」という意味です。
- `〜Turns` は残りターン数です。ターン終了時に 1 減らし、0 になったらキーを消します。
- `〜Layers` は重ねた回数です（まきびしは 1〜3、どくびしは 1〜2）。
- 技は `Move` の ID、タイプは `Type` の ID、特性は `AbilityRegistry` のキー（日本語名）で持ちます。
- ポケモンを指すときは `BattlePokemonStatus` の ID を使います。
- 状態は書き換えません。更新関数が新しいオブジェクトを返すので、それをリポジトリに渡します。
- バージョン番号は持ちません。キーの追加だけで型を広げます。

### 読むときの扱い（例外を投げない）

`parseVolatileState` と `parseSideState` は例外を投げません。古い行や壊れた値があってもバトルは止まりません。

- オブジェクトでない値（`null`・文字列・配列など）は空の状態として読む
- 知らないキーは捨てる
- 型が合わないキーは捨てる（ほかのキーは残す）
- 範囲外の値も捨てる（例: まきびしの 4 層、負のターン数）

注意: 知らないキーは捨てるので、新しいキーを書いたあとで古いコードに戻すと、次に保存したときにそのキーは消えます。

## 3. 使い方

```ts
import { updateVolatileState } from '@/modules/battle/domain/state/volatile-state';
import {
  getSideConditions,
  updateSideConditions,
  updateGlobalFieldState,
} from '@/modules/battle/domain/state/side-state';

// やどりぎのタネを植える
await battleRepository.updateBattlePokemonStatus(defender.id, {
  volatileState: updateVolatileState(defender.volatileState, { leechSeed: true }),
});

// ちょうはつを消す（undefined か null を渡したキーは取り除かれる）
await battleRepository.updateBattlePokemonStatus(target.id, {
  volatileState: updateVolatileState(target.volatileState, { tauntTurns: undefined }),
});

// 自分の陣営にリフレクターを張る
await battleRepository.update(battle.id, {
  sideState: updateSideConditions(battle.sideState, trainerId, { reflectTurns: 5 }),
});

// 相手の陣営のまきびしを読む
const spikes = getSideConditions(battle.sideState, opponentTrainerId).spikesLayers ?? 0;

// トリックルームを張る
await battleRepository.update(battle.id, {
  sideState: updateGlobalFieldState(battle.sideState, { trickRoomTurns: 5 }),
});
```

`battle` はターンの最初に読んだものです。同じターンの中で `sideState` を続けて書き換えるときは、`battleRepository.findById` で読み直してから更新してください。古い `battle` から更新すると、先に書いた内容が上書きされます。

## 4. VolatileState のキー

「使う技・特性」は、これから実装するときにこのキーを読み書きする予定のものです。

### 状態異常に近いカウンタ

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `confusionTurns` | 0 以上の整数 | こんらんの残りターン数 | こんらん（今はメモリ上で数えている。6 章） |
| `toxicCounter` | 0 以上の整数 | もうどくの経過ターン数 | もうどく（今はメモリ上で数えている。6 章） |

### ターン終了時に HP が増減する状態

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `leechSeed` | 真偽値 | やどりぎのタネを植えられている | やどりぎのタネ |
| `cursed` | 真偽値 | のろい（ゴースト）をかけられている | のろい |
| `nightmare` | 真偽値 | あくむを見ている | あくむ |
| `ingrain` | 真偽値 | 根を張っている（交代もできない） | ねをはる |
| `aquaRing` | 真偽値 | アクアリングをまとっている | アクアリング |
| `substituteHp` | 1 以上の整数 | みがわりの残り HP | みがわり・しっぽきり・すりぬけ |

### 技の選択の制限

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `tauntTurns` | 0 以上の整数 | ちょうはつの残りターン数 | ちょうはつ・アロマベール |
| `encore` | `{ moveId, turns }` | アンコールされた技と残りターン数 | アンコール・アロマベール |
| `disable` | `{ moveId, turns }` | かなしばりされた技と残りターン数 | かなしばり・のろわれボディ |
| `torment` | 真偽値 | いちゃもんをつけられている | いちゃもん |
| `healBlockTurns` | 0 以上の整数 | かいふくふうじの残りターン数 | かいふくふうじ |
| `imprison` | 真偽値 | ふういんを使った | ふういん |
| `choiceLockedMoveId` | 技 ID | こだわり系で固定された技 | ごりむちゅう |
| `lockedInMove` | `{ moveId, turns }` | 出し続ける技と残りターン数 | さわぐ |
| `chargingMoveId` | 技 ID | ためている技 | ジオコントロール・くちばしキャノン |
| `lastMoveId` | 技 ID | このポケモンが最後に使った技 | ものまね・オウムがえし・スケッチ・うらみ・いちゃもん・かなしばり・アンコール・さいはい |
| `lastHitByMoveId` | 技 ID | このポケモンが最後に受けた技 | テクスチャー２ |

さわぐの「場の誰も眠れない」は、場のポケモンの `lockedInMove` がさわぐかどうかで判定します。別のキーは持ちません。

### まもる系

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `protectCount` | 0 以上の整数 | まもる系を続けて成功させた回数 | まもる系すべて・こらえる |
| `protection` | `ProtectionKind` | このターンに張っている守り | まもる・みきり・キングシールド・ニードルガード・トーチカ・ブロッキング・スレッドトラップ・かえんのまもり・こらえる・ふかしのこぶし |

`ProtectionKind` は `'protect' | 'kingsShield' | 'spikyShield' | 'banefulBunker' | 'obstruct' | 'silkTrap' | 'burningBulwark' | 'endure'` です。`endure`（こらえる）は攻撃を防ぎませんが、連続で使うと失敗しやすくなる点が同じなので一緒に扱います。ワイドガードなど陣営全体の守りは `SideConditions` に置きます。

### このターンだけ続くフラグ

ターン終了時に消します。

| キー | 意味 | 使う技・特性 |
| --- | --- | --- |
| `destinyBond` | みちづれ | みちづれ |
| `grudge` | おんねん | おんねん |
| `magicCoat` | マジックコート | マジックコート |
| `snatch` | よこどり | よこどり |
| `powder` | ふんじんをかけられている | ふんじん |
| `electrified` | このターンに出す技がでんきタイプになる | そうでん |
| `roosting` | このターンはひこうタイプを失っている | はねやすめ |

### 命中・相性

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `lockOnTurns` | 0 以上の整数 | 次の技が必ず当たる残りターン数 | こころのめ・ロックオン |
| `foresight` | 真偽値 | 回避ランク無視、ゴーストにノーマル・かくとうが当たる | みやぶる・かぎわける |
| `miracleEye` | 真偽値 | 回避ランク無視、あくにエスパーが当たる | ミラクルアイ |
| `telekinesisTurns` | 0 以上の整数 | テレキネシスの残りターン数 | テレキネシス |
| `magnetRiseTurns` | 0 以上の整数 | でんじふゆうの残りターン数 | でんじふゆう |
| `tarShot` | 真偽値 | ほのお技の相性が 2 倍になる | タールショット |

### 相手との関係

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `infatuatedWithStatusId` | ポケモン ID | メロメロの相手 | メロメロ・メロメロボディ・アロマベール |
| `trappedByStatusId` | ポケモン ID | 逃げられなくした相手 | くろいまなざし・とおせんぼう・クモのす・たこがため |
| `octolock` | 真偽値 | ターン終了時に防御・特防が下がる | たこがため |

### 遅れて効く効果・段階

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `yawnTurns` | 0 以上の整数 | 眠るまでの残りターン数 | あくび |
| `perishCount` | 0〜3 | ほろびのうたのカウント（0 でひんし） | ほろびのうた・ほろびのボディ |
| `stockpileCount` | 1〜3 | たくわえるの回数 | たくわえる・はきだす・のみこむ |
| `critStageBoost` | 0 以上の整数 | 急所ランクの上昇 | きあいだめ |
| `laserFocusTurns` | 0 以上の整数 | 次の技が必ず急所になる残りターン数 | とぎすます |
| `charged` | 真偽値 | 次のでんき技の威力が 2 倍 | でんきにかえる |
| `loafing` | 真偽値 | 次のターンは動かない | なまけ |

### 上書き

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `abilitySuppressed` | 真偽値 | 特性が消されている | いえき |
| `abilityOverride` | 特性名 | 特性の上書き | スキルスワップ・なりきり・なやみのタネ・シンプルビーム・なかまづくり・トレース・ミイラ・さまようたましい・とれないにおい・うつしえ |
| `typeOverride` | タイプ ID の配列 | タイプの上書き（空配列はタイプなし） | ミラータイプ・まほうのこな・みずびたし・テクスチャー・テクスチャー２・ほごしょく・へんしょく・へんげんじざい・リベロ・ぎたい・てんきや |
| `addedTypeId` | タイプ ID | 3 つめに加わったタイプ | ハロウィン・もりののろい |
| `statOverrides` | `{ attack?, defense?, specialAttack?, specialDefense?, speed? }` | 実数値の上書き（ランク補正の前の値） | パワートリック・パワーシフト・ガードシェア・パワーシェア・スピードスワップ |
| `form` | 文字列 | 今のフォルム（`'blade'`・`'zen'`・`'busted'` など） | バトルスイッチ・ダルマモード・ばけのかわ・アイスフェイス など |
| `illusionTrainedPokemonId` | 育成ポケモン ID | イリュージョンで化けている先 | イリュージョン |
| `switchedInTurn` | 1 以上の整数 | 場に出たときの `Battle.turn` | スロースタート・はりこみ・たたみがえし |

へんしん・かわりものは、`typeOverride`・`abilityOverride`・`statOverrides` を組み合わせて表します。技の入れ替え（ものまね・スケッチ・へんしんの技）は、PP を持つ `BattlePokemonMove` の側で扱う想定で、ここには置いていません。

## 5. SideState のキー

```ts
type SideState = {
  sides?: { [trainerId: string]: SideConditions }; // キーはトレーナー ID の文字列
  global?: GlobalFieldState;
};
```

JSON のキーは文字列なので、`sides` のキーはトレーナー ID を文字列にしたもの（`'1'`・`'2'`）です。直接触らず、`getSideConditions` / `updateSideConditions` を使ってください。空になった陣営や `global` はキーごと消えます。

### SideConditions（片方の陣営）

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `reflectTurns` | 0 以上の整数 | リフレクターの残りターン数 | リフレクター・すりぬけ・バリアフリー・コートチェンジ |
| `lightScreenTurns` | 0 以上の整数 | ひかりのかべの残りターン数 | ひかりのかべ・すりぬけ・バリアフリー・コートチェンジ |
| `auroraVeilTurns` | 0 以上の整数 | オーロラベールの残りターン数 | オーロラベール・すりぬけ・バリアフリー・コートチェンジ |
| `tailwindTurns` | 0 以上の整数 | おいかぜの残りターン数 | おいかぜ・コートチェンジ |
| `safeguardTurns` | 0 以上の整数 | しんぴのまもりの残りターン数 | しんぴのまもり・すりぬけ |
| `mistTurns` | 0 以上の整数 | しろいきりの残りターン数 | しろいきり・すりぬけ |
| `luckyChantTurns` | 0 以上の整数 | おまじないの残りターン数 | おまじない |
| `spikesLayers` | 1〜3 | まきびしの層 | まきびし・コートチェンジ |
| `toxicSpikesLayers` | 1〜2 | どくびしの層 | どくびし・どくげしょう・コートチェンジ |
| `stealthRock` | 真偽値 | ステルスロック | ステルスロック・コートチェンジ |
| `stickyWeb` | 真偽値 | ねばねばネット | ねばねばネット・コートチェンジ |
| `wideGuard` | 真偽値 | このターンのワイドガード | ワイドガード |
| `quickGuard` | 真偽値 | このターンのファストガード | ファストガード |
| `craftyShield` | 真偽値 | このターンのトリックガード | トリックガード |
| `matBlock` | 真偽値 | このターンのたたみがえし | たたみがえし |
| `wish` | `{ turns, healAmount }` | ねがいごと。`turns` ターン後に場のポケモンを回復する | ねがいごと |
| `lunarDancePending` | 真偽値 | 次に出てきたポケモンを全回復する | みかづきのまい |

コートチェンジは、`sides` の 2 つの陣営の中身を入れ替えるだけで実装できます。

### GlobalFieldState（両陣営）

天候とフィールドの種類は、今までどおり `Battle.weather` / `Battle.field` が持ちます。ここには残りターン数などを置きます。

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `trickRoomTurns` | 0 以上の整数 | トリックルームの残りターン数 | トリックルーム |
| `gravityTurns` | 0 以上の整数 | じゅうりょくの残りターン数 | じゅうりょく |
| `wonderRoomTurns` | 0 以上の整数 | ワンダールームの残りターン数 | ワンダールーム |
| `magicRoomTurns` | 0 以上の整数 | マジックルームの残りターン数 | マジックルーム |
| `mudSportTurns` | 0 以上の整数 | どろあそびの残りターン数 | どろあそび |
| `waterSportTurns` | 0 以上の整数 | みずあそびの残りターン数 | みずあそび |
| `fairyLockTurns` | 0 以上の整数 | フェアリーロックの残りターン数 | フェアリーロック |
| `terrainTurns` | 0 以上の整数 | `Battle.field` の残りターン数 | グラスフィールドなどのフィールド |
| `ionDeluge` | 真偽値 | このターンだけ、ノーマル技がでんき技になる | プラズマシャワー |
| `lastMoveId` | 技 ID | バトル全体で最後に使われた技 | まねっこ |

## 6. まだしていないこと

### 交代で引っ込むときの消去

`volatileState` の多くは、交代で引っ込むと消えるはずです。ただし、今は消していません。交代の動きは今までと同じです。

消す処理は `PokemonSwitcherService.executeSwitch`（`src/modules/battle/application/services/pokemon-switcher.service.ts`）に入れます。引っ込むポケモンを `updateBattlePokemonStatus(currentActive.id, { isActive: false, statusCondition })` で更新している所です。ここで `volatileState` も一緒に渡します。

入れるときは次の点に気をつけてください。

1. 引っ込んでも消さないキーがある（たとえば `form` のうち、ばけのかわの `'busted'` はバトル中ずっと残る）
2. バトンタッチは `substituteHp`・`confusionTurns`・`leechSeed`・`cursed`・`ingrain`・`aquaRing`・`perishCount`・`trappedByStatusId` などを次のポケモンに引き継ぐ
3. 場に出たときに `switchedInTurn` を書き込む（出てくる側の `updateBattlePokemonStatus(targetStatus.id, { isActive: true })` の所）
4. 相手を逃げられなくしたポケモンが引っ込んだら、相手の `trappedByStatusId` と `infatuatedWithStatusId` も消す

### メモリ上だけで数えている状態

`StatusConditionProcessorService`（`src/modules/battle/application/services/status-condition-processor.service.ts`）は、もうどく・ねむり・こんらんのターン数を `Map` に持っています。サーバーを再起動すると、この数は 0 に戻ります。

この 3 つは今回は移していません。移すときは次のようにします。

1. もうどく: `toxicCounter` を使う
2. こんらん: `confusionTurns` を使う
3. ねむり: ねむりは交代しても続くので、`volatileState` には置かない。`BattlePokemonStatus` に別の列を足すか、交代で消さないキーとして扱う

## 7. キーの足し方

例として、`VolatileState` に「アンコールのように技とターン数を持つ」キーを足す場合です。`SideConditions` / `GlobalFieldState` も同じ手順です。

1. `volatile-state.ts` の `VolatileState` にキーを足す。任意（`?`）にし、`readonly` を付け、日本語のコメントを書く
2. 同じファイルの `VOLATILE_STATE_PARSERS` に読み方を足す（足さないとコンパイルが通らない）
   - 0 以上の整数: `nonNegativeInteger`
   - ID など 1 以上の整数: `positiveInteger`
   - 範囲のある整数: `integerInRange(min, max)`
   - 真偽値: `booleanValue`
   - 決まった文字列: `oneOf([...])`
   - 配列: `arrayOf(...)`
   - キーがすべて必須のオブジェクト: `requiredFieldsOf({...})`
   - キーがすべて任意のオブジェクト: `optionalFieldsOf({...})`
3. `volatile-state.spec.ts` の「正しい値はそのまま読み込む」にキーを足し、型が合わない値を捨てるテストも足す
4. この文書の表に 1 行足す
5. マイグレーションは要らない（JSON 列の中身が増えるだけ）

型は JSON にできる値（数値・真偽値・文字列・配列・オブジェクト）だけで組んでください。`Date`・`Map`・`Set`・`undefined` を値に使うと、保存したときに消えたり形が変わったりします。型は `interface` ではなく `type` で書きます。`interface` にすると、リポジトリで Prisma の JSON 型に渡せなくなります。
