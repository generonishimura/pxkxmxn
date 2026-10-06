import {
  FieldParsers,
  StatePatch,
  applyStatePatch,
  arrayOf,
  booleanValue,
  integerInRange,
  nonEmptyString,
  nonNegativeInteger,
  oneOf,
  optionalFieldsOf,
  parseFields,
  positiveInteger,
  requiredFieldsOf,
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
 * 場に出ているポケモンだけが持つ一時的な状態（BattlePokemonStatus.volatileState）
 *
 * - すべてのキーは任意。キーがないことは「その状態ではない」を意味する
 * - 〜Turns は残りターン数。0 になったらキーを消す
 * - 技は Move の ID、タイプは Type の ID、特性は AbilityRegistry のキー（日本語名）で持つ
 * - 交代で引っ込むときに消すものが多い。消す処理はまだ入れていない（docs/battle-state.md）
 */
export type VolatileState = {
  // ---- 状態異常に近いカウンタ ----
  /** こんらんの残りターン数 */
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

  // ---- まもる系 ----
  /** まもる系を続けて成功させた回数（成功率の低下に使う） */
  readonly protectCount?: number;
  /** このターンに張っている守り */
  readonly protection?: ProtectionKind;

  // ---- このターンだけ続くフラグ ----
  /** みちづれ */
  readonly destinyBond?: boolean;
  /** おんねん */
  readonly grudge?: boolean;
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
  /** 今のフォルム（'blade'・'zen'・'busted' など） */
  readonly form?: string;
  /** イリュージョンで化けている先（TrainedPokemon の ID） */
  readonly illusionTrainedPokemonId?: number;

  // ---- 場に出たタイミング ----
  /** 場に出たときの Battle.turn（スロースタート・はりこみ・たたみがえしが読む） */
  readonly switchedInTurn?: number;
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

/**
 * VolatileState の全キーの読み方
 * VolatileState にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
const VOLATILE_STATE_PARSERS: FieldParsers<VolatileState> = {
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
  protectCount: nonNegativeInteger,
  protection: oneOf(PROTECTION_KINDS),
  destinyBond: booleanValue,
  grudge: booleanValue,
  magicCoat: booleanValue,
  snatch: booleanValue,
  powder: booleanValue,
  electrified: booleanValue,
  roosting: booleanValue,
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
  critStageBoost: nonNegativeInteger,
  laserFocusTurns: nonNegativeInteger,
  charged: booleanValue,
  loafing: booleanValue,
  abilitySuppressed: booleanValue,
  abilityOverride: nonEmptyString,
  typeOverride: arrayOf(positiveInteger),
  addedTypeId: positiveInteger,
  statOverrides,
  form: nonEmptyString,
  illusionTrainedPokemonId: positiveInteger,
  switchedInTurn: positiveInteger,
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
