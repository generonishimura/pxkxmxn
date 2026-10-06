# バトルの状態（volatileState・persistentState・sideState）

ターンをまたいで残す必要があるバトルの状態は、3 つの JSON 列に保存します。

- `BattlePokemonStatus.volatileState`: 場に出ている間だけ続く、ポケモンごとの状態（やどりぎのタネ・みがわり・ちょうはつなど）。交代で引っ込むとすべて消えます。
- `BattlePokemonStatus.persistentState`: 交代しても消えない、ポケモンごとの状態（ばけのかわが破れた・ねむりの残りターン数など）。
- `Battle.sideState`: 陣営ごとの場の状態（リフレクター・まきびしなど）と、両陣営にかかる場の状態（トリックルームなど）。

型はドメイン層にあります。Prisma には依存しません。

- `src/modules/battle/domain/state/volatile-state.ts`（`VolatileState`）
- `src/modules/battle/domain/state/persistent-state.ts`（`PersistentPokemonState`）
- `src/modules/battle/domain/state/side-state.ts`（`SideState` / `SideConditions` / `GlobalFieldState`）
- `src/modules/battle/domain/state/state-field-parser.ts`（JSON を読む部品と、更新の共通処理）

エンジンは、片付け（交代時の消去・ターン終了時の減算など）と、一時的な状態の決まった効果（技を出す前の判定・技の制限・ため技・ターン終了時のダメージなど）を受け持ちます（4 章・10 章）。個々の技・特性は、まだほとんどこの状態を書いていません。この文書は、これから技や特性を実装するときの置き場所と決まりを書いたものです。技・特性から使う関数とフックは `docs/battle-engine-hooks.md` の 9 章にあります。

## 1. 保存のしかた

| 列 | テーブル | 型 | 既定値 |
| --- | --- | --- | --- |
| `volatile_state` | `battle_pokemon_status` | `JSONB NOT NULL` | `'{}'` |
| `persistent_state` | `battle_pokemon_status` | `JSONB NOT NULL` | `'{}'` |
| `side_state` | `battles` | `JSONB NOT NULL` | `'{}'` |

マイグレーションは `prisma/migrations/20261006170653_add_battle_state_columns/` の 1 つで、3 つの列をまとめて足します。既定値が `{}` なので、前からある行もそのまま読めます。

読み書きは `BattlePrismaRepository` がします。

1. 読むとき: `parseVolatileState` / `parsePersistentPokemonState` / `parseSideState` で型付きの状態にする
2. 作るとき: 空の状態（`{}`）を書き込む
3. 一部だけ書き換えるとき: 部分更新のメソッド（3 章）を使う
4. 丸ごと書き換えるとき: `updateBattlePokemonStatus(id, { volatileState })` や `update(id, { sideState })` で渡したときだけ書き込む。`null` を渡したときは空の状態を書く

## 2. 決まりごと

- すべてのキーは任意です。キーがないことは「その状態ではない」という意味です。
- `〜Turns` は残りターン数です。どこで減らすかはキーごとに決まっています（4 章）。0 になったらキーを消します。
- `〜Layers` は重ねた回数です（まきびしは 1〜3、どくびしは 1〜2）。
- 技は `Move` の ID、タイプは `Type` の ID、特性は `AbilityRegistry` のキー（日本語名）で持ちます。
- ポケモンを指すときは `BattlePokemonStatus` の ID を使います。例外はありません。
- 状態は書き換えません。更新関数が新しいオブジェクトを返します。
- バージョン番号は持ちません。キーの追加だけで型を広げます。

### 読むときの扱い（例外を投げない）

`parseVolatileState` / `parsePersistentPokemonState` / `parseSideState` は例外を投げません。古い行や壊れた値があってもバトルは止まりません。

- オブジェクトでない値（`null`・文字列・配列など）は空の状態として読む
- 知らないキーは捨てる
- 型が合わないキーは捨てる（ほかのキーは残す）
- 範囲外の値も捨てる（例: まきびしの 4 層、負のターン数）

注意: 知らないキーは捨てるので、新しいキーを書いたあとで古いコードに戻すと、次に保存したときにそのキーは消えます。

## 3. 読み書きのしかた

### 必ず守ること: 書き換えるときは部分更新を使う

状態を書き換えるときは、次の部分更新のメソッドを使ってください。手元の entity から作った状態を丸ごと書いてはいけません。これは例外のない決まりです。

| メソッド | 書き換える所 |
| --- | --- |
| `patchVolatileState(statusId, patch)` | ポケモンの `volatileState` |
| `patchPersistentState(statusId, patch)` | ポケモンの `persistentState` |
| `patchSideConditions(battleId, trainerId, patch)` | 陣営の `SideConditions` |
| `patchGlobalFieldState(battleId, patch)` | 両陣営にかかる `GlobalFieldState` |

部分更新は、DB の最新の行を読み直してから patch を当てます（行を `FOR UPDATE` でロックし、トランザクションの中で読む → parse → patch → 書き込み）。

理由: JSON 列は丸ごと置き換わります。古い entity から書くと、次のように先に書かれたキーが消えます。

1. 速い A が B にちょうはつ → B の `volatileState` は `{ tauntTurns: 3 }`
2. 遅い B の技の処理が、手元の古い B（`{}`）に `critStageBoost: 2` を足して丸ごと書く
3. B の `volatileState` は `{ critStageBoost: 2 }` になり、ちょうはつが消える

効果を書く人には、同じターンに先に誰かが書いたかどうかが分かりません。だから常に部分更新を使います。

```ts
// やどりぎのタネを植える
await battleRepository.patchVolatileState(defender.id, { leechSeed: true });

// ちょうはつを消す（undefined か null を渡したキーは取り除かれる）
await battleRepository.patchVolatileState(target.id, { tauntTurns: null });

// 自分の陣営にリフレクターを張る
await battleRepository.patchSideConditions(battle.id, trainerId, { reflectTurns: 5 });

// トリックルームを張る
await battleRepository.patchGlobalFieldState(battle.id, { trickRoomTurns: 5 });

// ばけのかわが破れた（交代しても残る）
await battleRepository.patchPersistentState(holder.id, { disguiseBusted: true });
```

### 読むとき

- `ExecuteTurnUseCase` は、行動のたびにバトルと場のポケモンを読み直してから技を出します。技の処理が受け取る `battle` / `attacker` / `defender` は、その行動の直前の最新の値です。先に行動した相手が張ったまもる・ちょうはつ・壁も見えます。
- 自分で書いたあとに続けて読むときは、部分更新の返り値を使うか、`findById` / `findBattlePokemonStatusById` で読み直してください。

```ts
// 相手の陣営のまきびしを読む
const spikes = getSideConditions(battle.sideState, opponentTrainerId).spikesLayers ?? 0;
```

## 4. 片付けの場所（エンジンが書くもの）

片付けはエンジンの決まった場所だけで行います。技や特性の実装では、自分で残りターン数を減らしたり、交代時に消したりしないでください。二重に減らす・消し忘れる、といったずれのもとになります。

| いつ | どこで | 何をするか |
| --- | --- | --- |
| バトル開始で先発が場に出たとき | `StartBattleUseCase.execute` | `switchedInTurn` に `0` を書く |
| 交代で引っ込むとき | `PokemonSwitcherService.executeSwitch` | 引っ込むポケモンの `volatileState` をすべて消す（`clearVolatileOnSwitchOut`）。`persistentState` は残す |
| 交代で引っ込んだあと | `PokemonSwitcherService.executeSwitch` | ほかのポケモンの、引っ込んだポケモンによる `trappedByStatusId`・`octolock`・`infatuatedWithStatusId` を消す（`releaseVolatileReferencesTo`） |
| 場のポケモンがひんしになったとき | `ExecuteTurnUseCase.execute`（技を出すたびと、ターン終了時の片付けの前） | ほかのポケモンの、ひんしのポケモンによる `trappedByStatusId`・`octolock`・`infatuatedWithStatusId`・`partialTrap` を消す（`releaseVolatileReferencesTo`）。ひんしのポケモンは交代するまで場に残るので、交代を待たずに消す |
| 交代で場に出たとき | `PokemonSwitcherService.executeSwitch` | `switchedInTurn` に今の `Battle.turn` を書く。`transfer` を渡したときは、引っ込む前の状態から引き継ぐキーも書く（10 章） |
| 技を出そうとしたとき | `BeforeMoveChecker.check` | 最初に `grudge` を消す。反動のターンは `mustRecharge` を消す。こんらんの `confusionTurns` を 1 減らす。技を出せなかったら（反動のターンも）`destinyBond`・`protectCount` を消し、反動以外で止まったら `chargingMoveId`・`semiInvulnerable`・`lockedInMove`・`uproar`・`consecutiveMoveCount` も消す。でんき技（じゅうでんを除く）で止まったら `charged` も消す |
| 技を出す前の判定を通ったとき | `MoveLifecycle.recordMoveUse` | 使用者の `destinyBond`・`grudge` を消す（`clearVolatileOnBeforeMove`。技を出せなかったときは `BeforeMoveChecker` が消す）。`lastMoveId`・`GlobalFieldState.lastMoveId`・`choiceLockedMoveId` を書き、`protectCount` を消す |
| 技を出したあと | `MoveLifecycle.afterMove` | `mustRecharge`・`lockedInMove`・`uproar`・`consecutiveMoveCount` を書き直し、でんき技なら `charged` を消す |
| ターン終了時（特性の前） | `StatusConditionProcessorService.processTurnEndAbilities` → `VolatileResidualProcessor` | すなあらし・ねがいごと・アクアリング・ねをはる・やどりぎのタネ・あくむ・のろい・バインド・しおづけ・たこがため・あくび・ほろびのうた（10 章） |
| ターン終了時 | `ExecuteTurnUseCase.execute`（特性・状態異常のターン終了時の処理のあと） | 場のポケモンの `volatileState` を `tickVolatileStateAtTurnEnd` で、`sideState` を `tickSideStateAtTurnEnd` で進める |
| ターン終了時に場のポケモンがひんしのとき | `ExecuteTurnUseCase.execute` | その `volatileState` をすべて消す（ほろびのカウント・みがわりを、さいきのいのりで持ち越さない） |

### ターン終了時に進めるキー

どのキーをどう進めるかは、型付きの一覧で決まっています。キーを足すときは、どの一覧に入れるか（どれにも入れないか）を決めてください。

| 一覧 | 場所 | ターン終了時の動き |
| --- | --- | --- |
| `VOLATILE_TURN_COUNTER_KEYS` | `volatile-state.ts` | 1 減らし、0 になったら消す（ちょうはつ・かいふくふうじ・ロックオン・テレキネシス・でんじふゆう・あくび・とぎすます・じごくづき） |
| `VOLATILE_MOVE_TURNS_COUNTER_KEYS` | `volatile-state.ts` | `turns` を 1 減らし、0 になったら消す（アンコール・かなしばり） |
| `VOLATILE_TURN_SCOPED_FLAGS` | `volatile-state.ts` | 消す（まもる系・ひるみ・マジックコート・よこどり・ふんじん・そうでん・はねやすめ・くちばしキャノンの加熱） |
| `VOLATILE_UNTIL_NEXT_MOVE_FLAGS` | `volatile-state.ts` | 消さない。技を出そうとしたときに消す（みちづれ・おんねん） |
| `SIDE_TURN_COUNTER_KEYS` | `side-state.ts` | 1 減らし、0 になったら消す（壁・おいかぜ・しんぴのまもり・しろいきり・おまじない） |
| `SIDE_TURN_SCOPED_FLAGS` | `side-state.ts` | 消す（ワイドガード・ファストガード・トリックガード・たたみがえし） |
| `GLOBAL_TURN_COUNTER_KEYS` | `side-state.ts` | 1 減らし、0 になったら消す（天候・フィールド・各ルーム・じゅうりょく・どろあそび・みずあそび・フェアリーロック） |
| `GLOBAL_TURN_SCOPED_FLAGS` | `side-state.ts` | 消す（プラズマシャワー） |

ねがいごと（`wish`）とみらいよち（`futureAttack`）も、ターン終了時に `turns` を 1 減らし、0 になったら消します。

どの一覧にも入らないキーは、`tickVolatileStateAtTurnEnd` では触りません。たとえば次のものです。

- `confusionTurns`: 技を出そうとするたびに `BeforeMoveChecker` が減らす
- `toxicCounter`: もうどくのダメージのたびに増やす
- `perishCount`・`partialTrap`: ターン終了時に `VolatileResidualProcessor` が減らす（10 章）
- `lockedInMove`: 技を出すたびに `MoveLifecycle.afterMove` が減らす
- `chargingMoveId`・`semiInvulnerable`・`mustRecharge`・`consecutiveMoveCount`・`uproar`: 技の流れの中で `MoveLifecycle` / `BeforeMoveChecker` が書き、消す

### 切れたときに効果があるもの

あくびで眠る、ねがいごとで回復する、みらいよちが当たる、天候やフィールドが終わる、などの効果は、ターン終了時の特性・状態異常の処理の中で行います。この処理は減らす前に走るので、値が `1` なら「このターンの終わりで切れる」と判定できます。あくび・ねがいごと・みらいよちは、エンジンがもう行っています（10 章）。

1. ターン終了時の処理（`VolatileResidualProcessor.applyAfterStatusDamage`）が `yawnTurns === 1` を見て、眠らせる
2. そのあとで `tickVolatileStateAtTurnEnd` が `yawnTurns` を消す

天候とフィールドも同じです。`weatherTurns === 1` / `terrainTurns === 1` のとき、ターン終了時の処理で `Battle.weather` / `Battle.field` を元に戻します。

### エンジンが書くキー

次のキーは、技の処理の中心である `MoveExecutorService`（`BeforeMoveChecker` / `MoveLifecycle`）だけが書きます。個々の技や特性の実装では書きません（読むのはかまいません）。

| キー | 書く場所 | 書く内容 |
| --- | --- | --- |
| `lastMoveId` | `MoveLifecycle.recordMoveUse` | 技を出す前の判定を通った技（失敗・外れでも書く）。ゆびをふるなどで呼ばれた技では書かない（呼んだ技のまま） |
| `consecutiveMoveCount` | `recordMoveUse` / `afterMove` | 同じ技を続けて成功させた回数。技の処理の中では「この技を直前まで続けて成功させた回数」（別の技なら、ない） |
| `lastHitByMoveId` | 技の本体 | 1 以上のダメージを受けた技 |
| `GlobalFieldState.lastMoveId` | `recordMoveUse` | バトル全体で最後に出た技（呼ばれた技も書く。まねっこが読む） |
| `protectCount` | `recordMoveUse` / `BeforeMoveChecker` | まもる系（技の `isProtectionMove`）以外の技を出したら消す。技を出せなかったとき（ひるみ・まひ・ねむり・反動など）も消す（本家の stall は、次のターンにまもる系を成功させなければ切れる） |
| `choiceLockedMoveId` | `recordMoveUse` | 特性の `locksMoveChoice`（ごりむちゅう）なら、最初に出した技（わるあがきを除く） |
| `chargingMoveId`・`semiInvulnerable` | `MoveLifecycle.handleChargeTurn` | ため技の 1 ターン目に書き、2 ターン目・技を出せなかったときに消す |
| `mustRecharge` | `afterMove` / `BeforeMoveChecker` | 反動技（`MoveBehaviors` の `recharge`）が当たったら書き、次の行動で消す |
| `lockedInMove`・`uproar` | `afterMove` | 出し続ける技の残りターン数（使ったターンを含まない）。終わり・失敗・技を出せなかったときに消す |
| `charged` | `afterMove` / `BeforeMoveChecker` | でんき技を出したら消す（じゅうでんそのものは除く）。でんき技を出そうとして止まったときも消す（第 9 世代の本家と同じ）。書くのは技・特性 |
| `confusionTurns` | `BeforeMoveChecker` | 技を出そうとするたびに 1 減らす。書くのは `inflictStatus`（こんらん） |
| `SideConditions.futureAttack` | `MoveLifecycle.scheduleFutureAttack` | みらいよち・はめつのねがい（`MoveBehaviors` の `futureMove`）を使ったら相手の陣営に書く |

## 5. VolatileState のキー

「使う技・特性」は、これから実装するときにこのキーを読み書きする予定のものです。

### 状態異常に近いカウンタ

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `confusionTurns` | 0 以上の整数 | こんらんの残り回数（2〜5）。こんらんかどうかは、このキーがあるかで決める。技を出そうとするたびに 1 減らし、0 で解けてそのまま技を出す | こんらんにする技・特性（`inflictStatus(StatusCondition.Confusion)` が書く）・マイペース・どくくぐつ |
| `toxicCounter` | 0 以上の整数 | もうどくの経過ターン数 | もうどく（今はメモリ上で数えている。8 章） |

### ターン終了時に HP が増減する状態

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `leechSeed` | 真偽値 | やどりぎのタネを植えられている | やどりぎのタネ |
| `cursed` | 真偽値 | のろい（ゴースト）をかけられている | のろい |
| `nightmare` | 真偽値 | あくむを見ている | あくむ |
| `ingrain` | 真偽値 | 根を張っている（交代もできない） | ねをはる |
| `aquaRing` | 真偽値 | アクアリングをまとっている | アクアリング |
| `partialTrap` | `{ sourceStatusId, moveId, turns }` | バインド状態。`turns` は残りターン数（技は 5 か 6 を書く）。ターン終了時に 1 減らし、残っていれば 1/8 のダメージ、0 なら解ける。しめつけたポケモンが場を離れると解ける | しめつける・まきつく・ほのおのうず・うずしお・すなじごく・まとわりつく・マグマストーム・トラバサミ・サンダープリズン |
| `saltCure` | 真偽値 | しおづけ（ターン終了時に 1/8、みず・はがねは 1/4） | しおづけ |
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
| `choiceLockedMoveId` | 技 ID | こだわり系で固定された技（エンジンが書く） | ごりむちゅう |
| `lockedInMove` | `{ moveId, turns }` | 出し続ける技と、使ったターンのあとの残りターン数（エンジンが書く） | さわぐ・あばれる・げきりん・はなびらのまい・ころがる・アイスボール |
| `chargingMoveId` | 技 ID | ためている技（エンジンが書く） | ソーラービーム・そらをとぶ・ジオコントロールなどのため技 |
| `throatChopTurns` | 0 以上の整数 | じごくづきの残りターン数（音技を出せない） | じごくづき |
| `lastMoveId` | 技 ID | このポケモンが最後に使った技（エンジンが書く。4 章） | ものまね・オウムがえし・スケッチ・うらみ・いちゃもん・かなしばり・アンコール・さいはい |
| `lastHitByMoveId` | 技 ID | このポケモンが最後に受けた技（エンジンが書く。4 章） | テクスチャー２ |
| `moveSlotOverrides` | `{ battlePokemonMoveId, moveId, currentPp, maxPp }[]` | 一時的に入れ替わった技 | ものまね・へんしん・かわりもの |

さわぐの「場の誰も眠れない」は、`uproar` で判定します（`canInflictStatus` がねむりを断る）。

### 技の流れ（エンジンが書く）

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `semiInvulnerable` | `'air' \| 'underground' \| 'underwater' \| 'vanished'` | ため技の 1 ターン目に隠れている（そらをとぶ・あなをほる・ダイビング・シャドーダイブなど）。当たる技は `MoveBehaviors.hitsSemiInvulnerable` | ため技・かぜおこし・じしん・なみのり・うちおとす |
| `mustRecharge` | 真偽値 | 次の行動は反動で動けない | はかいこうせんなどの反動技 |
| `consecutiveMoveCount` | 1 以上の整数 | `lastMoveId` の技を続けて成功させた回数 | れんぞくぎり・みちづれ（続けて使うと失敗する判定） |
| `uproar` | 真偽値 | さわいでいる（場の誰もねむれない） | さわぐ |

### まもる系

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `protectCount` | 0 以上の整数 | まもる系を続けて成功させた回数 | まもる系すべて・こらえる |
| `protection` | `ProtectionKind` | このターンに張っている守り | まもる・みきり・キングシールド・ニードルガード・トーチカ・ブロッキング・スレッドトラップ・かえんのまもり・こらえる・ふかしのこぶし |

`ProtectionKind` は `'protect' | 'kingsShield' | 'spikyShield' | 'banefulBunker' | 'obstruct' | 'silkTrap' | 'burningBulwark' | 'endure'` です。`endure`（こらえる）は攻撃を防ぎませんが、連続で使うと失敗しやすくなる点が同じなので一緒に扱います。ワイドガードなど陣営全体の守りは `SideConditions` に置きます。

### このターンだけ続くフラグ

ターン終了時に消えます（`VOLATILE_TURN_SCOPED_FLAGS`）。

| キー | 意味 | 使う技・特性 |
| --- | --- | --- |
| `flinched` | ひるんだ（このターンは動けない） | ひるみ・ふくつのこころ・せいしんりょく |
| `magicCoat` | マジックコート | マジックコート |
| `snatch` | よこどり | よこどり |
| `powder` | ふんじんをかけられている | ふんじん |
| `electrified` | このターンに出す技がでんきタイプになる | そうでん |
| `roosting` | このターンはひこうタイプを失っている | はねやすめ |
| `beakBlast` | くちばしキャノンを加熱している（このターンに接触技を受けると、相手をやけどにする） | くちばしキャノン |

### 使用者が次に技を出そうとするまで続くフラグ

ターン終了時には消えません。使用者が次に技を出そうとしたときに消えます（`VOLATILE_UNTIL_NEXT_MOVE_FLAGS`）。まひ・ねむり・ひるみ・こんらんの自傷・反動などで技を出せなかったときも消えます（本家はみちづれを onMoveAborted で、おんねんを onBeforeMove で消す）。

| キー | 意味 | 使う技・特性 |
| --- | --- | --- |
| `destinyBond` | みちづれ | みちづれ |
| `grudge` | おんねん | おんねん |

ターンをまたいでも続く例です。

1. ターン N に、遅いみちづれの使用者が最後に行動する
2. ターン N + 1 に、速い相手が使用者を倒す
3. みちづれはまだ効いているので、相手も倒れる

みちづれを続けて使ったときの失敗判定は、技の `shouldFail` で `consecutiveMoveCount > 0` を見てください（`docs/battle-engine-hooks.md` の 9.3）。技の処理の中では `destinyBond` はもう消えているので、読んでも判定できません。

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

相手のポケモンが場を離れると、そのポケモンを指すこの 3 つは消えます（4 章）。

### 遅れて効く効果・段階

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `yawnTurns` | 0 以上の整数 | 眠るまでの残りターン数。使ったターンに `2` を書くと、次のターンの終わりに眠る | あくび |
| `perishCount` | 0〜3 | ほろびのうたのカウント。使ったターンに `3` を書く。ターン終了時に 0 ならひんし、それ以外は 1 減らす（4 回目のターン終了時にひんし） | ほろびのうた・ほろびのボディ |
| `stockpileCount` | 1〜3 | たくわえるの回数 | たくわえる・はきだす・のみこむ |
| `stockpileBoosts` | `{ defense, specialDefense }`（各 0〜6） | たくわえるで実際に上がったランク | たくわえる・はきだす・のみこむ |
| `critStageBoost` | 0 以上の整数 | 急所ランクの上昇 | きあいだめ |
| `laserFocusTurns` | 0 以上の整数 | 次の技が必ず急所になる残りターン数 | とぎすます |
| `charged` | 真偽値 | 次のでんき技の威力が 2 倍。でんき技を出すとエンジンが消す（第 9 世代は、でんき技を出すまで続く） | じゅうでん・でんきにかえる・ふうりょくでんき |
| `loafing` | 真偽値 | 次のターンは動かない | なまけ |

`stockpileBoosts` は、ランクが +6 で上がらなかった分を数えません。のみこむ・はきだすでは、この値の分だけ防御・特防を下げます。

### 上書き

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `abilitySuppressed` | 真偽値 | 特性が消されている | いえき |
| `abilityOverride` | 特性名 | 特性の上書き | スキルスワップ・なりきり・なやみのタネ・シンプルビーム・なかまづくり・トレース・ミイラ・さまようたましい・とれないにおい・うつしえ |
| `typeOverride` | タイプ ID の配列 | タイプの上書き（空配列はタイプなし） | ミラータイプ・まほうのこな・みずびたし・テクスチャー・テクスチャー２・ほごしょく・へんしょく・へんげんじざい・リベロ・ぎたい・てんきや |
| `addedTypeId` | タイプ ID | 3 つめに加わったタイプ | ハロウィン・もりののろい |
| `statOverrides` | `{ attack?, defense?, specialAttack?, specialDefense?, speed? }` | 実数値の上書き（ランク補正の前の値） | パワートリック・パワーシフト・ガードシェア・パワーシェア・スピードスワップ |
| `transformedIntoStatusId` | ポケモン ID | へんしん・かわりもので姿を写した相手 | へんしん・かわりもの |
| `form` | 文字列 | 交代で元に戻るフォルム（`'blade'`・`'zen'` など） | バトルスイッチ・ダルマモード・うのミサイル・はらぺこスイッチ |
| `illusionStatusId` | ポケモン ID | イリュージョンで化けている先 | イリュージョン |
| `typeChangeAbilityUsed` | 真偽値 | へんげんじざい・リベロを、場に出てから使った | へんげんじざい・リベロ（第 9 世代は場に出るたびに 1 回） |

交代しても戻らないフォルムは、`PersistentPokemonState.form` に置きます（6 章）。

へんしん・かわりものは、`transformedIntoStatusId` で「へんしん中」を表し、`typeOverride`・`abilityOverride`・`statOverrides`・`moveSlotOverrides` を組み合わせます。スキルスワップとみずびたしを両方受けた状態とは、`transformedIntoStatusId` があるかで区別できます。

### 技の入れ替え（moveSlotOverrides）

ものまね・へんしん・かわりものの技は、引っ込むと元に戻ります。そのため `BattlePokemonMove.moveId` は書き換えず、`moveSlotOverrides` に置きます。

- 1 つの要素が、技の欄 1 つ分の入れ替えです。`battlePokemonMoveId` が入れ替える前の欄、`moveId` / `currentPp` / `maxPp` が代わりの技です（へんしんは各 5 PP）。
- 技を選ぶ処理（`ExecuteTurnUseCase.planAction`）と、PP を減らす処理（`MoveLifecycle.consumePp`・`reducePp`）は、`moveSlotOverrides` を先に見ます（`resolveMoveSlots`）。ものまねで覚えた技を選ぶと、入れ替える前の欄の ID で技を出し、PP は `moveSlotOverrides` の `currentPp` から減ります。
- 交代で `volatileState` ごと消えるので、元に戻す処理は要りません。
- スケッチはずっと残るので、`updateBattlePokemonMove(id, { moveId, currentPp, maxPp })` で `BattlePokemonMove` の技そのものを書き換えます。

### 場に出たタイミング

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `switchedInTurn` | 0 以上の整数 | 場に出たときの `Battle.turn`。先発は `0` | スロースタート・はりこみ・たたみがえし・ねこだまし・であいがしら |

先発は `0`、ターン N に交代で出たら `N` です。出てから最初に行動するターンは `switchedInTurn + 1` になります。技ごとの比べ方は次のとおりです。

| 技・特性 | 条件 |
| --- | --- |
| ねこだまし・であいがしら・たたみがえし（出てから最初の行動） | `battle.turn === switchedInTurn + 1` |
| はりこみ（相手がこのターンに交代で出てきた） | `target.switchedInTurn === battle.turn` |
| スロースタート（出てから 5 ターン） | `battle.turn - switchedInTurn <= 5` |

## 6. PersistentPokemonState のキー

交代しても消えません。ひんしになっても消しません（さいきのいのりで復活したときに引き継ぎます）。

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `sleepTurns` | 0 以上の整数 | ねむりの残りターン数（交代しても続く） | ねむり・ねむる・はやおき（今はメモリ上で数えている。8 章） |
| `form` | 文字列 | 交代しても戻らないフォルム（`'hero'`・`'ash'`・`'complete'` など） | マイティチェンジ・きずなへんげ・スワームチェンジ |
| `disguiseBusted` | 真偽値 | ばけのかわが破れた | ばけのかわ |
| `iceFaceBroken` | 真偽値 | アイスフェイスが壊れた（ゆきで戻る） | アイスフェイス |
| `oncePerBattleAbilityUsed` | 真偽値 | 1 バトルに 1 回だけの特性を使った | ふとうのけん・ふくつのたて・きずなへんげ |

マイティチェンジは、引っ込むことでフォルムが変わります。引っ込むときに `PersistentPokemonState.form` に `'hero'` を書いてください。

## 7. SideState のキー

```ts
type SideState = {
  sides?: { [trainerId: string]: SideConditions }; // キーはトレーナー ID の文字列
  global?: GlobalFieldState;
};
```

JSON のキーは文字列なので、`sides` のキーはトレーナー ID を文字列にしたもの（`'1'`・`'2'`）です。直接触らず、`getSideConditions` と部分更新のメソッドを使ってください。空になった陣営や `global` はキーごと消えます。

### SideConditions（片方の陣営）

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `reflectTurns` | 0 以上の整数 | リフレクターの残りターン数 | リフレクター・すりぬけ・バリアフリー・コートチェンジ |
| `lightScreenTurns` | 0 以上の整数 | ひかりのかべの残りターン数 | ひかりのかべ・すりぬけ・バリアフリー・コートチェンジ |
| `auroraVeilTurns` | 0 以上の整数 | オーロラベールの残りターン数 | オーロラベール・すりぬけ・バリアフリー・コートチェンジ |
| `tailwindTurns` | 0 以上の整数 | おいかぜの残りターン数 | おいかぜ・コートチェンジ |
| `safeguardTurns` | 0 以上の整数 | しんぴのまもりの残りターン数 | しんぴのまもり・すりぬけ・コートチェンジ |
| `mistTurns` | 0 以上の整数 | しろいきりの残りターン数 | しろいきり・すりぬけ・コートチェンジ |
| `luckyChantTurns` | 0 以上の整数 | おまじないの残りターン数 | おまじない |
| `spikesLayers` | 1〜3 | まきびしの層 | まきびし・コートチェンジ |
| `toxicSpikesLayers` | 1〜2 | どくびしの層 | どくびし・どくげしょう・コートチェンジ |
| `stealthRock` | 真偽値 | ステルスロック | ステルスロック・コートチェンジ |
| `stickyWeb` | 真偽値 | ねばねばネット | ねばねばネット・コートチェンジ |
| `wideGuard` | 真偽値 | このターンのワイドガード | ワイドガード |
| `quickGuard` | 真偽値 | このターンのファストガード | ファストガード |
| `craftyShield` | 真偽値 | このターンのトリックガード | トリックガード |
| `matBlock` | 真偽値 | このターンのたたみがえし | たたみがえし |
| `wish` | `{ turns, healAmount }` | ねがいごと。使ったターンに `turns: 2` を書くと、次のターンの終わりに、その陣営の場のポケモンを `healAmount` だけ回復する（エンジンが行う。かいふくふうじ中は回復しない） | ねがいごと |
| `futureAttack` | `{ turns, moveId, sourceStatusId }` | みらいよち・はめつのねがい。使ったターンにエンジンが `turns: 3` で書き、`turns` が 1 のターン終了時に、その陣営の場のポケモンに当てる | みらいよち・はめつのねがい |
| `healingWish` | `'healingWish' \| 'lunarDance'` | 次に出てきたポケモンを回復する技 | いやしのねがい（HP と状態異常）・みかづきのまい（PP も） |
| `pendingChoice` | `{ reason }` | 交代先（復活させるポケモン）の選択を待っている | とんぼがえり・すてゼリフ・テレポート・バトンタッチ・しっぽきり・ききかいひ・にげごし・さいきのいのり |

### コートチェンジ

コートチェンジは `swapCourtChangeConditions(state, trainerIdA, trainerIdB)` で実装します。入れ替えるのは `COURT_CHANGE_KEYS` のキーだけです（壁・おいかぜ・しんぴのまもり・しろいきり・おまじない・設置技）。

次のキーは入れ替えません。陣営の中身を丸ごと入れ替えると、相手のねがいごとで自分のポケモンが回復したり、相手のワイドガードが移ったりします。

- `wish`・`healingWish`
- `wideGuard`・`quickGuard`・`craftyShield`・`matBlock`
- `pendingChoice`

### 交代先の選択（pendingChoice）

技や特性のあとでプレイヤーが交代先を選ぶ仕組みは、`pendingChoice` を使う案に決めます。流れは次のとおりです。

1. 技や特性の処理が、交代する側の陣営に `pendingChoice` を書く
2. `ExecuteTurnUseCase` は、そこでターンの処理を止めて結果を返す
3. クライアントが交代先（復活させるポケモン）を選んで送る
4. 交代して `pendingChoice` を消し、残りの行動とターン終了時の処理を続ける

`ExecuteTurnParams` に交代先を先に入れておく案は採りません。技が当たるか、ききかいひが発動するかは、ターンの途中まで分からないためです。2〜4 の API と処理はまだありません。最初に使う項目を実装するときに作ってください。

### GlobalFieldState（両陣営）

天候とフィールドの種類は、今までどおり `Battle.weather` / `Battle.field` が持ちます。ここには残りターン数などを置きます。

| キー | 型 | 意味 | 使う技・特性 |
| --- | --- | --- | --- |
| `weatherTurns` | 0 以上の整数 | `Battle.weather` の天候の残りターン数。キーがない天候は終わらない | あまごい・にほんばれ・すなあらし・ゆき・あめふらし など |
| `weatherSourceStatusId` | ポケモン ID | ゲンシ天候を出したポケモン。このポケモンが場を離れたら天候が終わる | はじまりのうみ・おわりのだいち・デルタストリーム |
| `trickRoomTurns` | 0 以上の整数 | トリックルームの残りターン数 | トリックルーム |
| `gravityTurns` | 0 以上の整数 | じゅうりょくの残りターン数 | じゅうりょく |
| `wonderRoomTurns` | 0 以上の整数 | ワンダールームの残りターン数 | ワンダールーム |
| `magicRoomTurns` | 0 以上の整数 | マジックルームの残りターン数 | マジックルーム |
| `mudSportTurns` | 0 以上の整数 | どろあそびの残りターン数 | どろあそび |
| `waterSportTurns` | 0 以上の整数 | みずあそびの残りターン数 | みずあそび |
| `fairyLockTurns` | 0 以上の整数 | フェアリーロックの残りターン数 | フェアリーロック |
| `terrainTurns` | 0 以上の整数 | `Battle.field` の残りターン数 | グラスフィールドなどのフィールド |
| `ionDeluge` | 真偽値 | このターンだけ、ノーマル技がでんき技になる | プラズマシャワー |
| `lastMoveId` | 技 ID | バトル全体で最後に使われた技（エンジンが書く。4 章） | まねっこ |

### 天候について

- `Weather` enum（`battle.entity.ts` と `prisma/schema.prisma`）には、まだ `Snow`（ゆき）とゲンシ天候（`HarshSunlight`・`HeavyRain`・`StrongWinds`）がありません。さむいギャグ・ゆきふらし（第 9 世代）・ゲンシ天候を入れるときは、enum に値を足し、Prisma の enum のマイグレーションを作ってください。
- ゲンシ天候は普通の天候で上書きできません。`weatherSourceStatusId` があるときは、天候を出す処理は何もしないでください。
- 今ある天候とフィールドを出す処理は、残りターン数を書いていません。そのため天候もフィールドも終わりません。`weatherTurns` / `terrainTurns` を使い始めるときは、次の処理にも残りターン数を書く変更が要ります。
  - `src/modules/pokemon/domain/abilities/effects/base/base-weather-effect.ts`（あめふらし・ひでり・すなおこし・ゆきふらし）
  - `src/modules/pokemon/domain/moves/effects/base/base-weather-move-effect.ts`（あまごい・にほんばれ など）
  - `src/modules/pokemon/domain/abilities/effects/weather/*-surge-effect.ts`（エレキメイカー など）
  - `src/modules/pokemon/domain/moves/effects/*-terrain-effect.ts`（エレキフィールド など）

## 8. まだしていないこと

### メモリ上だけで数えている状態

`StatusConditionProcessorService`（`src/modules/battle/application/services/status-condition-processor.service.ts`）は、もうどく・ねむりのターン数を `Map` に持っています。サーバーを再起動すると、この数は 0 に戻ります。移すときは次のようにします。

1. もうどく: `volatileState.toxicCounter` を使う。交代で消えるのは今と同じ
2. ねむり: `persistentState.sleepTurns` を使う。今の `Map` は経過ターン数を数えているので、眠らせるときに残りターン数を決めて書き、減らしていく形に変える

こんらん（`confusionTurns`）とひるみ（`flinched`）は、volatileState に移し終えています。どちらも状態異常と同時に持てます。

- 付与: `canInflictStatus` / `inflictStatus` に `StatusCondition.Confusion` / `Flinch` を渡す。状態異常の欄ではなく volatileState に書く（こんらんは残り 2〜5 回）。マイペース・せいしんりょくは `canReceiveStatusCondition` で防ぐ
- 判定: `BeforeMoveChecker`（ひるみで動けない・こんらんの自傷）
- 古い行: `statusCondition` に `Confusion` / `Flinch` が入っている行は、リポジトリが読むときに `confusionTurns: 2` / なしに読み替え、書くときに `None` に直す

### API で状態をそのまま返している

`battle.controller.ts` の `POST /battle/start`・`POST /battle/:id/turn`・`GET /battle/:id` は、entity をそのまま返しています。そのため `volatileState`・`persistentState`・`sideState` が、両方のプレイヤーにそのまま見えます。

イリュージョンを実装する前に、controller で状態を response DTO に詰め替えてください。そのとき、相手に見せないキー（`illusionStatusId` など）を外します。

## 9. キーの足し方

例として、`VolatileState` に「アンコールのように技とターン数を持つ」キーを足す場合です。`PersistentPokemonState` / `SideConditions` / `GlobalFieldState` も同じ手順です。

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
3. 片付けのグループを決める（4 章の一覧のどれかに入れるか、どれにも入れないか）。`〜Turns` のキーをターン終了時に減らさないときは、テストの例外にも足す
4. `volatile-state.spec.ts` を直す
   - `FULL_VOLATILE_STATE` にキーを足す（`Required` なので、足さないとコンパイルが通らない）。往復のテストと、読み方の表とのキーの一致のテストがこれを使う
   - 数値のキーなら `LOWER_BOUNDS` に足す（足さないとテストが落ちる）。上限があれば `UPPER_BOUNDS` にも足す
   - 型が合わない値を捨てるテストを足す
5. この文書の表に 1 行足す
6. マイグレーションは要らない（JSON 列の中身が増えるだけ）

型は JSON にできる値（数値・真偽値・文字列・配列・オブジェクト）だけで組んでください。`Date`・`Map`・`Set`・`undefined` を値に使うと、保存したときに消えたり形が変わったりします。型は `interface` ではなく `type` で書きます。`interface` にすると、リポジトリで Prisma の JSON 型に渡せなくなります。

## 10. エンジンが行う一時的な状態の効果

次の効果は、キーがあればエンジンが行います。技・特性の実装では、キーを書くだけです（書き方は `docs/battle-engine-hooks.md` の 9 章）。

### 技を出す前（`BeforeMoveChecker`）

本家の onBeforeMove の順に判定し、止まったら技を出しません（PP も減りません）。

判定の前に、`encore` があるのに別の技を出そうとしていたら（行動を決めたあと、このターンに先にアンコールされたとき）、アンコールされた技に変えます（`MoveExecutorService.executeMove`。本家の onOverrideAction）。PP はアンコールされた技の欄から減ります。その技の PP が 0 ならアンコールを消し、選んだ技を出します。ため技の 2 ターン目・出し続ける技・反動のターン・わるあがきは変えません。

1. `mustRecharge`: 動けない（キーを消す。なまけの `loafing` も消す）
2. ねむり: 動けない（`MoveBehaviors` の `sleepUsable` の技は出せる）
3. こおり: 20% で溶ける（`defrost` の技は必ず溶ける）
4. 特性の `onBeforeMove`（なまけ）
5. `flinched`: 動けない。特性の `onFlinch`（ふくつのこころ）を呼ぶ
6. 技の制限（`findMoveRestriction` の `phase: 'execute'`）: `disable`・`healBlockTurns`・`throatChopTurns`・`tauntTurns`・相手の `imprison`・`choiceLockedMoveId`。`encore`・`torment`・続けて出せない技は、技を選ぶとき（`planAction`）だけ見る。本家でも技を選ぶときだけ効くので、ため技の 2 ターン目・出し続ける技は止まらない
7. `confusionTurns`: 1 減らす。0 なら解けて技を出す。残っていれば 33% で自分を攻撃する
8. `infatuatedWithStatusId`: 相手がそのポケモンなら 50% で動けない
9. まひ: 25% で動けない

判定の前に `grudge` を消します。1〜9 で止まったときは `destinyBond`・`protectCount` を消し、2〜9 で止まったときは `chargingMoveId`・`semiInvulnerable`・`lockedInMove`・`uproar`・`consecutiveMoveCount` も消します。でんき技（じゅうでんを除く）で止まったときは `charged` も消します。

### 行動を決めるとき（`ExecuteTurnUseCase.planAction`）

- `mustRecharge`・`chargingMoveId`・`lockedInMove` があれば、選んだ行動（交代も）にかかわらず、その技を出す
- `encore` があれば、選んだ技にかかわらずアンコールされた技を出す（交代はできる）。その技の PP が 0 ならアンコールを消す
- 技の欄は `moveSlotOverrides` を先に見る
- PP がない・技の制限で出せない技を選び、ほかに出せる技もなければ、わるあがきを出す
- `ingrain`・`trappedByStatusId`・`partialTrap` があれば交代できない（ゴーストタイプは `ingrain` 以外では交代できる。`findSwitchBlocker`）。かけたポケモンがひんし・場にいない `trappedByStatusId`・`partialTrap` は見ない

### 技の処理の中

| キー | 効果 | 場所 |
| --- | --- | --- |
| `powder`（使用者） | ほのお技を出そうとすると失敗し、最大 HP の 1/4（四捨五入）のダメージ | `MoveExecutorService.useMove` |
| `snatch`（相手） | `MoveBehaviors` の `snatch` の技を、相手が代わりに出す | `useMove` |
| `semiInvulnerable`（相手） | `MoveBehaviors.hitsSemiInvulnerable` の技しか当たらない（使用者の `lockOnTurns` があれば当たる）。当たる技の一部はダメージ 2 倍 | 技の本体・`DamageCalculator` |
| `substituteHp`（相手） | ダメージをみがわりが受ける。相手を対象にする変化技は失敗する（`bypassSubstitute` の技と、特性の `infiltrates` は通る） | 技の本体 |
| `beakBlast`（相手） | 接触技を当てると、使用者がやけどになる | 技の本体 |
| `destinyBond`・`grudge`（相手） | 技で倒されたら、使用者もひんし・その技の PP が 0 | `MoveLifecycle.applyFaintReactions` |
| `statOverrides` | ランク補正の前の実数値を置き換える（行動順の素早さも） | `createHitContext`・`DamageCalculator`・行動順 |
| `foresight`・`miracleEye`・`ingrain`（相手） | タイプ相性 0 を等倍にする（ゴーストにノーマル・かくとう、あくにエスパー、ひこうにじめん）。みやぶる・ミラクルアイは、上がった回避ランクを 0 として扱う | `DamageCalculator`・`AccuracyCalculator` |
| `tarShot`・`magnetRiseTurns`・`telekinesisTurns`（相手） | ほのお技の相性 2 倍 / じめん技が当たらない | `DamageCalculator` |
| `charged`（使用者） | でんき技の威力 2 倍 | `DamageCalculator` |
| `lockOnTurns`（使用者）・`telekinesisTurns`（相手） | 必ず当たる | `AccuracyCalculator` |
| `uproar`（場の誰か） | ねむりにできない | `canInflictStatus` |

### ターン終了時（`VolatileResidualProcessor`）

`processTurnEndAbilities` の中で、次の順に行います。ダメージは `applyIndirectDamage`（マジックガードは受けない）、回復は `applyHeal`（かいふくふうじ中は回復しない）です。

1. すなあらし: 最大 HP の 1/16（いわ・じめん・はがねタイプ、すながくれ・すなかき・すなのちから・ぼうじんは受けない）
2. `wish.turns === 1`: その陣営の場のポケモンを `healAmount` 回復
3. ポケモンごとに:
   1. `aquaRing`・`ingrain`: 1/16 回復
   2. `leechSeed`: 1/8 を吸い、相手の場のポケモンが同じ量を回復（`applyDrainHeal`。ヘドロえきなら相手がダメージ）
   3. 状態異常（ねむりの解除・どく・もうどく・やけど）
   4. `nightmare`: ねむっていれば（ぜったいねむりを含む）1/4。目を覚ましていればキーを消す
   5. `cursed`: 1/4
   6. `partialTrap`: しめつけたポケモンがひんし・場にいなければ解ける（ダメージなし）。そうでなければ `turns` を 1 減らし、残っていれば 1/8、0 なら解ける
   7. `saltCure`: 1/8（みず・はがねタイプは 1/4）
   8. `octolock`: 防御・特防 -1（たこがためを使ったポケモンが起こした、技による変化）。使ったポケモンがひんし・場にいなければ、下げずに `octolock`・`trappedByStatusId` を消す
   9. `yawnTurns === 1`: ねむりにする
   10. `perishCount`: 0 ならひんし（マジックガードでも防げない）、それ以外は 1 減らす
   11. 特性の `onTurnEnd`

みらいよち（`futureAttack.turns === 1`）は、このすぐ前に `ExecuteTurnUseCase` が `MoveExecutorService.executeFutureAttacks` で当てます。そのあと `tickVolatileStateAtTurnEnd` / `tickSideStateAtTurnEnd` で残りターン数を減らします。

注: 本家は効果ごとに場の全員を素早さ順に処理しますが、ここではポケモンごとに 3 の順で処理します。みらいよちも、本家ではすなあらしのあと・ねがいごとの前ですが、ここではすなあらしより前です。

### バトンタッチ・しっぽきり（`PokemonSwitcherService.executeSwitch`）

`executeSwitch(battle, trainerId, trainedPokemonId, { transfer })` に `transfer` を渡すと、引っ込む前の状態から次のポケモンに書きます。

- `'batonPass'`: `BATON_PASS_KEYS` のキー（`substituteHp`・`confusionTurns`・`leechSeed`・`cursed`・`ingrain`・`aquaRing`・`tauntTurns`・`healBlockTurns`・`perishCount`・`telekinesisTurns`・`magnetRiseTurns`・`tarShot`・`critStageBoost`・`laserFocusTurns`・`charged`・`abilitySuppressed`・`throatChopTurns`）と能力ランク
- `'shedTail'`: `substituteHp` だけ（`shedTailPatch`）

注: 交代先をプレイヤーが選ぶ仕組み（7 章の `pendingChoice`）はまだないので、技から `executeSwitch` を呼ぶ流れは、その仕組みと一緒に作ってください。
