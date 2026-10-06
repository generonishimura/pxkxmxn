import {
  FieldParsers,
  KeysOfType,
  MutableStatePatch,
  StatePatch,
  applyStatePatch,
  arrayOf,
  booleanValue,
  integerInRange,
  isEmptyObject,
  markRemoved,
  nonEmptyString,
  nonNegativeInteger,
  oneOf,
  optionalFieldsOf,
  parseFields,
  positiveInteger,
  requiredFieldsOf,
  tickTurnCount,
} from './state-field-parser';

/**
 * まもる系の技で、このターンに張っている守りの種類
 * endure（こらえる）は攻撃を防がないが、連続で使うと失敗しやすくなる点が同じなので一緒に扱う
 */
export const PROTECTION_KINDS = [
  'protect', // まもる・みきり
  'kingsShield', // キングシールド
  'spikyShield', // ニードルガード
  'banefulBunker', // トーチカ
  'obstruct', // ブロッキング
  'silkTrap', // スレッドトラップ
  'burningBulwark', // かえんのまもり
  'endure', // こらえる
] as const;

export type ProtectionKind = (typeof PROTECTION_KINDS)[number];

/**
 * 技 ID と残りターン数の組（アンコール・かなしばりなど）
 */
export type MoveTurns = {
  readonly moveId: number;
  readonly turns: number;
};

/**
 * 実数値の上書き（パワートリック・ガードシェア・スピードスワップなど）
 * ランク補正の前の値を置き換える。HP は含めない
 */
export type StatOverrides = {
  readonly attack?: number;
  readonly defense?: number;
  readonly specialAttack?: number;
  readonly specialDefense?: number;
  readonly speed?: number;
};

/**
 * 一時的に入れ替わった技 1 つ分（ものまね・へんしん・かわりもの）
 * 元の BattlePokemonMove は書き換えず、その欄の代わりにこの技と PP を使う
 */
export type MoveSlotOverride = {
  /** 入れ替える前の技の欄（BattlePokemonMove の ID） */
  readonly battlePokemonMoveId: number;
  /** 代わりに使える技 */
  readonly moveId: number;
  /** 代わりの技の残り PP */
  readonly currentPp: number;
  /** 代わりの技の最大 PP（へんしんは 5） */
  readonly maxPp: number;
};

/**
 * たくわえるで実際に上がったランク（のみこむ・はきだすで、この分だけ下げる）
 */
export type StockpileBoosts = {
  readonly defense: number;
  readonly specialDefense: number;
};

/**
 * 場に出ているポケモンだけが持つ一時的な状態（BattlePokemonStatus.volatileState）
 *
 * - すべてのキーは任意。キーがないことは「その状態ではない」を意味する
 * - 〜Turns は残りターン数。0 になったらキーを消す
 * - 技は Move の ID、タイプは Type の ID、特性は AbilityRegistry のキー（日本語名）で持つ
 * - 交代で引っ込むと、すべてのキーを消す（clearVolatileOnSwitchOut）。交代しても残る状態は PersistentPokemonState に置く
 * - ターン終了時に減らすキー・消すキーは、下の 〜_KEYS / 〜_FLAGS にまとめる（docs/battle-state.md）
 */
export type VolatileState = {
  // ---- 状態異常に近いカウンタ ----
  /**
   * こんらんの残りターン数。こんらんかどうかは、このキーがあるかで決める
   * 技を出そうとするたびに 1 減らす（ターン終了時には減らさない）
   */
  readonly confusionTurns?: number;
  /** もうどくの経過ターン数（ダメージが 1/16 ずつ増える） */
  readonly toxicCounter?: number;

  // ---- ターン終了時に HP が増減する状態 ----
  /** やどりぎのタネを植えられている */
  readonly leechSeed?: boolean;
  /** のろい（ゴースト）をかけられている */
  readonly cursed?: boolean;
  /** あくむを見ている */
  readonly nightmare?: boolean;
  /** ねをはるで根を張っている（交代もできない） */
  readonly ingrain?: boolean;
  /** アクアリングをまとっている */
  readonly aquaRing?: boolean;

  // ---- みがわり ----
  /** みがわりの残り HP */
  readonly substituteHp?: number;

  // ---- 技の選択の制限 ----
  /** ちょうはつの残りターン数 */
  readonly tauntTurns?: number;
  /** アンコールされた技と残りターン数 */
  readonly encore?: MoveTurns;
  /** かなしばりされた技と残りターン数 */
  readonly disable?: MoveTurns;
  /** いちゃもんをつけられている */
  readonly torment?: boolean;
  /** かいふくふうじの残りターン数 */
  readonly healBlockTurns?: number;
  /** ふういんを使った（相手は自分と同じ技を出せない） */
  readonly imprison?: boolean;
  /** こだわり系・ごりむちゅうで固定された技 */
  readonly choiceLockedMoveId?: number;
  /** さわぐ・あばれるなど、続けて出し続ける技と残りターン数 */
  readonly lockedInMove?: MoveTurns;
  /** ため技（ジオコントロール・くちばしキャノンなど）でためている技 */
  readonly chargingMoveId?: number;
  /** このポケモンが最後に使った技（ものまね・アンコール・かなしばりなどが読む） */
  readonly lastMoveId?: number;
  /** このポケモンが最後に受けた技（テクスチャー２が読む） */
  readonly lastHitByMoveId?: number;
  /**
   * 一時的に入れ替わった技（ものまね・へんしん・かわりもの）
   * 技を選ぶ処理と PP を減らす処理は、BattlePokemonMove より先にここを見る
   */
  readonly moveSlotOverrides?: readonly MoveSlotOverride[];

  // ---- まもる系 ----
  /** まもる系を続けて成功させた回数（成功率の低下に使う） */
  readonly protectCount?: number;
  /** このターンに張っている守り */
  readonly protection?: ProtectionKind;

  // ---- このターンだけ続くフラグ ----
  /** ひるんだ（このターンは動けない。ふくつのこころが読む） */
  readonly flinched?: boolean;
  /** マジックコート */
  readonly magicCoat?: boolean;
  /** よこどり */
  readonly snatch?: boolean;
  /** ふんじんをかけられている */
  readonly powder?: boolean;
  /** そうでんで、このターンに出す技がでんきタイプになる */
  readonly electrified?: boolean;
  /** はねやすめで、このターンはひこうタイプを失っている */
  readonly roosting?: boolean;

  // ---- 使用者が次に技を出そうとするまで続くフラグ ----
  /** みちづれ（ターンをまたいでも、次に技を出そうとするまで続く） */
  readonly destinyBond?: boolean;
  /** おんねん（ターンをまたいでも、次に技を出そうとするまで続く） */
  readonly grudge?: boolean;

  // ---- 命中・相性 ----
  /** こころのめ・ロックオンの残りターン数（次の技が必ず当たる） */
  readonly lockOnTurns?: number;
  /** みやぶる・かぎわける（回避ランク無視、ゴーストにノーマル・かくとうが当たる） */
  readonly foresight?: boolean;
  /** ミラクルアイ（回避ランク無視、あくにエスパーが当たる） */
  readonly miracleEye?: boolean;
  /** テレキネシスの残りターン数 */
  readonly telekinesisTurns?: number;
  /** でんじふゆうの残りターン数 */
  readonly magnetRiseTurns?: number;
  /** タールショット（ほのお技の相性が 2 倍になる） */
  readonly tarShot?: boolean;

  // ---- 相手との関係 ----
  /** メロメロの相手（BattlePokemonStatus の ID） */
  readonly infatuatedWithStatusId?: number;
  /** 逃げられなくした相手（くろいまなざし・とおせんぼう・クモのす・たこがため） */
  readonly trappedByStatusId?: number;
  /** たこがためで、ターン終了時に防御・特防が下がる */
  readonly octolock?: boolean;

  // ---- 遅れて効く効果 ----
  /** あくびで眠るまでの残りターン数 */
  readonly yawnTurns?: number;
  /** ほろびのうたのカウント（0 になるとひんし） */
  readonly perishCount?: number;

  // ---- 段階・回数 ----
  /** たくわえるの回数（1〜3） */
  readonly stockpileCount?: number;
  /** たくわえるで実際に上がったランク（ランクが +6 のときは上がらない分を数えない） */
  readonly stockpileBoosts?: StockpileBoosts;
  /** 急所ランクの上昇（きあいだめは +2） */
  readonly critStageBoost?: number;
  /** とぎすますの残りターン数（次の技が必ず急所） */
  readonly laserFocusTurns?: number;
  /** でんきにかえる・じゅうでん（次のでんき技の威力が 2 倍） */
  readonly charged?: boolean;
  /** なまけで、次のターンは動かない */
  readonly loafing?: boolean;

  // ---- 上書き ----
  /** いえきで特性が消されている */
  readonly abilitySuppressed?: boolean;
  /** 特性の上書き（スキルスワップ・なかまづくりなど）。AbilityRegistry のキー */
  readonly abilityOverride?: string;
  /** タイプの上書き（みずびたし・テクスチャーなど）。Type の ID。空配列はタイプなし */
  readonly typeOverride?: readonly number[];
  /** 3 つめに加わったタイプ（ハロウィン・もりののろい）。Type の ID */
  readonly addedTypeId?: number;
  /** 実数値の上書き */
  readonly statOverrides?: StatOverrides;
  /** へんしん・かわりもので姿を写した相手（BattlePokemonStatus の ID） */
  readonly transformedIntoStatusId?: number;
  /**
   * 交代で元に戻るフォルム（バトルスイッチの 'blade'・ダルマモードの 'zen' など）
   * 交代しても残るフォルムは PersistentPokemonState.form に置く
   */
  readonly form?: string;
  /** イリュージョンで化けている先（BattlePokemonStatus の ID） */
  readonly illusionStatusId?: number;

  // ---- 場に出たタイミング ----
  /**
   * 場に出たときの Battle.turn。先発は 0、ターン N に交代で出たら N
   * 出てから最初に行動するターンは switchedInTurn + 1（ねこだまし・たたみがえし）
   */
  readonly switchedInTurn?: number;
  /** へんげんじざい・リベロを、場に出てから使った（場に出るたびに 1 回だけ） */
  readonly typeChangeAbilityUsed?: boolean;
};

const moveTurns = requiredFieldsOf<MoveTurns>({
  moveId: positiveInteger,
  turns: nonNegativeInteger,
});

const statOverrides = optionalFieldsOf<StatOverrides>({
  attack: positiveInteger,
  defense: positiveInteger,
  specialAttack: positiveInteger,
  specialDefense: positiveInteger,
  speed: positiveInteger,
});

const moveSlotOverride = requiredFieldsOf<MoveSlotOverride>({
  battlePokemonMoveId: positiveInteger,
  moveId: positiveInteger,
  currentPp: nonNegativeInteger,
  maxPp: positiveInteger,
});

/**
 * ランクの上がり幅（0〜6）
 */
const rankBoost = integerInRange(0, 6);

const stockpileBoosts = requiredFieldsOf<StockpileBoosts>({
  defense: rankBoost,
  specialDefense: rankBoost,
});

/**
 * VolatileState の全キーの読み方
 * VolatileState にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
export const VOLATILE_STATE_PARSERS: FieldParsers<VolatileState> = {
  confusionTurns: nonNegativeInteger,
  toxicCounter: nonNegativeInteger,
  leechSeed: booleanValue,
  cursed: booleanValue,
  nightmare: booleanValue,
  ingrain: booleanValue,
  aquaRing: booleanValue,
  substituteHp: positiveInteger,
  tauntTurns: nonNegativeInteger,
  encore: moveTurns,
  disable: moveTurns,
  torment: booleanValue,
  healBlockTurns: nonNegativeInteger,
  imprison: booleanValue,
  choiceLockedMoveId: positiveInteger,
  lockedInMove: moveTurns,
  chargingMoveId: positiveInteger,
  lastMoveId: positiveInteger,
  lastHitByMoveId: positiveInteger,
  moveSlotOverrides: arrayOf(moveSlotOverride),
  protectCount: nonNegativeInteger,
  protection: oneOf(PROTECTION_KINDS),
  flinched: booleanValue,
  magicCoat: booleanValue,
  snatch: booleanValue,
  powder: booleanValue,
  electrified: booleanValue,
  roosting: booleanValue,
  destinyBond: booleanValue,
  grudge: booleanValue,
  lockOnTurns: nonNegativeInteger,
  foresight: booleanValue,
  miracleEye: booleanValue,
  telekinesisTurns: nonNegativeInteger,
  magnetRiseTurns: nonNegativeInteger,
  tarShot: booleanValue,
  infatuatedWithStatusId: positiveInteger,
  trappedByStatusId: positiveInteger,
  octolock: booleanValue,
  yawnTurns: nonNegativeInteger,
  perishCount: integerInRange(0, 3),
  stockpileCount: integerInRange(1, 3),
  stockpileBoosts,
  critStageBoost: nonNegativeInteger,
  laserFocusTurns: nonNegativeInteger,
  charged: booleanValue,
  loafing: booleanValue,
  abilitySuppressed: booleanValue,
  abilityOverride: nonEmptyString,
  typeOverride: arrayOf(positiveInteger),
  addedTypeId: positiveInteger,
  statOverrides,
  transformedIntoStatusId: positiveInteger,
  form: nonEmptyString,
  illusionStatusId: positiveInteger,
  switchedInTurn: nonNegativeInteger,
  typeChangeAbilityUsed: booleanValue,
};

/**
 * 何の状態も持たない VolatileState を返す
 */
export const emptyVolatileState = (): VolatileState => ({});

/**
 * 元の状態を書き換えずに、patch を当てた新しい VolatileState を返す
 * undefined か null を渡したキーは取り除く
 */
export const updateVolatileState = (
  state: VolatileState,
  patch: StatePatch<VolatileState>,
): VolatileState => applyStatePatch(state, patch);

/**
 * DB の JSON 列から VolatileState を読む
 * 例外は投げない。オブジェクトでない値は空の状態にし、知らないキーと型が合わないキーは捨てる
 */
export const parseVolatileState = (json: unknown): VolatileState =>
  parseFields(json, VOLATILE_STATE_PARSERS);

/**
 * ターン終了時に 1 減らし、0 になったら消す残りターン数
 * こんらん（confusionTurns）は技を出そうとするたびに減らすので入れない
 * 切れたときに効果があるもの（あくびで眠るなど）は、tick の前に値が 1 かどうかで判定する
 */
export const VOLATILE_TURN_COUNTER_KEYS = [
  'tauntTurns',
  'healBlockTurns',
  'lockOnTurns',
  'telekinesisTurns',
  'magnetRiseTurns',
  'yawnTurns',
  'laserFocusTurns',
] as const satisfies ReadonlyArray<KeysOfType<VolatileState, number>>;

/**
 * ターン終了時に turns を 1 減らし、0 になったら消す「技とターン数」
 * さわぐ・あばれる（lockedInMove）は技を出すたびに減らすので入れない
 */
export const VOLATILE_MOVE_TURNS_COUNTER_KEYS = [
  'encore',
  'disable',
] as const satisfies ReadonlyArray<KeysOfType<VolatileState, MoveTurns>>;

/**
 * このターンだけ続き、ターン終了時に消すキー
 */
export const VOLATILE_TURN_SCOPED_FLAGS = [
  'protection',
  'flinched',
  'magicCoat',
  'snatch',
  'powder',
  'electrified',
  'roosting',
] as const satisfies ReadonlyArray<keyof VolatileState>;

/**
 * 使用者が次に技を出そうとしたときに消すキー（ターン終了時には消さない）
 */
export const VOLATILE_UNTIL_NEXT_MOVE_FLAGS = [
  'destinyBond',
  'grudge',
] as const satisfies ReadonlyArray<keyof VolatileState>;

/**
 * patch が空なら元の状態をそのまま、そうでなければ patch を当てた新しい状態を返す
 */
const applyIfChanged = (
  state: VolatileState,
  patch: MutableStatePatch<VolatileState>,
): VolatileState => (isEmptyObject(patch) ? state : updateVolatileState(state, patch));

/**
 * 交代で引っ込むときの VolatileState を返す（すべてのキーを消す）
 * バトンタッチ・しっぽきりで引き継ぐキーは、引っ込む前の状態から読んで次のポケモンに書く
 */
export const clearVolatileOnSwitchOut = (): VolatileState => emptyVolatileState();

/**
 * ターン終了時の VolatileState を返す
 * 残りターン数を 1 減らして 0 になったキーを消し、このターンだけのフラグを消す
 * 変える所がないときは、同じオブジェクトを返す（書き込みが要るかを === で判定できる）
 */
export const tickVolatileStateAtTurnEnd = (state: VolatileState): VolatileState => {
  const patch: MutableStatePatch<VolatileState> = {};
  for (const key of VOLATILE_TURN_COUNTER_KEYS) {
    const turns = state[key];
    if (turns !== undefined) {
      patch[key] = tickTurnCount(turns);
    }
  }
  for (const key of VOLATILE_MOVE_TURNS_COUNTER_KEYS) {
    const moveTurns = state[key];
    if (moveTurns !== undefined) {
      const turns = tickTurnCount(moveTurns.turns);
      patch[key] = turns === undefined ? undefined : { ...moveTurns, turns };
    }
  }
  for (const key of VOLATILE_TURN_SCOPED_FLAGS) {
    if (state[key] !== undefined) {
      markRemoved(patch, key);
    }
  }
  return applyIfChanged(state, patch);
};

/**
 * 技を出そうとしたときの VolatileState を返す（みちづれ・おんねんを消す）
 * 変える所がないときは、同じオブジェクトを返す
 */
export const clearVolatileOnBeforeMove = (state: VolatileState): VolatileState => {
  const patch: MutableStatePatch<VolatileState> = {};
  for (const key of VOLATILE_UNTIL_NEXT_MOVE_FLAGS) {
    if (state[key] !== undefined) {
      markRemoved(patch, key);
    }
  }
  return applyIfChanged(state, patch);
};

/**
 * statusId のポケモンが場を離れたときの、ほかのポケモンの VolatileState を返す
 * そのポケモンによる「逃げられない」「たこがため」「メロメロ」を消す
 * 変える所がないときは、同じオブジェクトを返す
 */
export const releaseVolatileReferencesTo = (
  state: VolatileState,
  statusId: number,
): VolatileState => {
  const patch: MutableStatePatch<VolatileState> = {};
  if (state.trappedByStatusId === statusId) {
    patch.trappedByStatusId = undefined;
    patch.octolock = undefined;
  }
  if (state.infatuatedWithStatusId === statusId) {
    patch.infatuatedWithStatusId = undefined;
  }
  return applyIfChanged(state, patch);
};
