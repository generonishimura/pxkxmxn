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
 * ため技でためている間の隠れ方（そらをとぶ・あなをほるなど）
 * - air: そらをとぶ・とびはねる・フリーフォール
 * - underground: あなをほる
 * - underwater: ダイビング
 * - vanished: シャドーダイブ・ゴーストダイブ
 */
export const SEMI_INVULNERABLE_KINDS = ['air', 'underground', 'underwater', 'vanished'] as const;

export type SemiInvulnerableKind = (typeof SEMI_INVULNERABLE_KINDS)[number];

/**
 * しめつける・まきつく・ほのおのうずなど、ターン終了時にダメージを受ける「バインド状態」
 * turns は本家の残りターン数（4〜5 回ダメージを受けたあと、次のターン終了時に解ける）
 */
export type PartialTrap = {
  /** しめつけたポケモン（BattlePokemonStatus の ID）。場を離れると解ける */
  readonly sourceStatusId: number;
  /** しめつけた技（Move の ID） */
  readonly moveId: number;
  /** 残りターン数。ターン終了時に 1 減らし、0 になったら解ける（ダメージは受けない） */
  readonly turns: number;
};

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
  /** このポケモンが最後に受けた技 */
  readonly lastHitByMoveId?: number;
  /**
   * このポケモンが最後に使った技の、タイプを変える効果を反映したタイプ名（エンジンが書く。テクスチャー２が読む）
   * lastMoveId と同じときに書く（呼ばれた技では書かない）。タイプなしの技（わるあがき）は書かない
   */
  readonly lastMoveTypeName?: string;
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
  /**
   * たくわえるでランクが変わった回数（能力ごと、1 回につき 1。たんじゅんで 2 上がっても・あまのじゃくで下がっても 1。
   * +6 で上がらなければ数えない）。はきだす・のみこむは、-値を applyStatChanges に渡して戻す（ランクを直接引かない）
   */
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
  /**
   * タイプの上書き（みずびたし・テクスチャーなど）。タイプ名（Type.name）の配列。
   * タイプなしは '???'（TYPELESS_TYPE_NAME）で表す。読むときは resolveEffectiveTypeNames を通す
   */
  readonly typeOverride?: readonly string[];
  /** 3 つめに加わったタイプ（ハロウィン・もりののろい）。タイプ名（Type.name） */
  readonly addedType?: string;
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
  /**
   * スロースタートを、場に出たあと（場に出たターンより後）に得たときの Battle.turn（スキルスワップ・なりきりなど）
   * あれば、スロースタートはこのターンから数える。場に出たときから持っていれば書かない（switchedInTurn で数える）
   */
  readonly slowStartTurn?: number;

  // ---- 技の流れ（エンジンが書く） ----
  /** ため技でためている間の隠れ方。ため技を出すか、出せなかったときにエンジンが消す */
  readonly semiInvulnerable?: SemiInvulnerableKind;
  /** はかいこうせんなどの反動で、次の行動は動けない。次に行動するときにエンジンが消す */
  readonly mustRecharge?: boolean;
  /**
   * lastMoveId の技を続けて成功させた回数（1 以上）。ころがる・れんぞくぎりの威力に使う
   * 技が失敗・外れたとき、別の技を出したときにエンジンが書き直す
   */
  readonly consecutiveMoveCount?: number;
  /** さわぐで、場の誰も眠れない。lockedInMove が終わったターンのターン終了時に消える（失敗・技を出せなかったときはすぐ消える） */
  readonly uproar?: boolean;

  // ---- そのほか ----
  /** じごくづきの残りターン数（音技を出せない） */
  readonly throatChopTurns?: number;
  /** しめつける系のバインド状態 */
  readonly partialTrap?: PartialTrap;
  /** しおづけ（ターン終了時に最大 HP の 1/8、みず・はがねは 1/4 のダメージ） */
  readonly saltCure?: boolean;
  /** くちばしキャノンをためている（このターンに接触技を受けると、相手をやけどにする） */
  readonly beakBlast?: boolean;
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

const partialTrap = requiredFieldsOf<PartialTrap>({
  sourceStatusId: positiveInteger,
  moveId: positiveInteger,
  turns: nonNegativeInteger,
});

const moveSlotOverride = requiredFieldsOf<MoveSlotOverride>({
  battlePokemonMoveId: positiveInteger,
  moveId: positiveInteger,
  currentPp: nonNegativeInteger,
  maxPp: positiveInteger,
});

/**
 * たくわえるでランクが変わった回数（書くのは 0〜3。読むときは 0〜6 まで受け付ける）
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
  lastMoveTypeName: nonEmptyString,
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
  typeOverride: arrayOf(nonEmptyString),
  addedType: nonEmptyString,
  statOverrides,
  transformedIntoStatusId: positiveInteger,
  form: nonEmptyString,
  illusionStatusId: positiveInteger,
  switchedInTurn: nonNegativeInteger,
  typeChangeAbilityUsed: booleanValue,
  slowStartTurn: nonNegativeInteger,
  semiInvulnerable: oneOf(SEMI_INVULNERABLE_KINDS),
  mustRecharge: booleanValue,
  consecutiveMoveCount: positiveInteger,
  uproar: booleanValue,
  throatChopTurns: nonNegativeInteger,
  partialTrap,
  saltCure: booleanValue,
  beakBlast: booleanValue,
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
  'throatChopTurns',
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
  'beakBlast',
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
 * バトンタッチで次のポケモンに引き継ぐキー（本家の noCopy でない状態）
 * 能力ランクは列（attackRank など）にあるので、ここには入らない
 * 注: パワートリックの実数値の入れ替え（statOverrides）は引き継がない
 */
export const BATON_PASS_KEYS = [
  'confusionTurns',
  'leechSeed',
  'cursed',
  'ingrain',
  'aquaRing',
  'substituteHp',
  'tauntTurns',
  'healBlockTurns',
  'perishCount',
  'telekinesisTurns',
  'magnetRiseTurns',
  'tarShot',
  'critStageBoost',
  'laserFocusTurns',
  'charged',
  'abilitySuppressed',
  'throatChopTurns',
] as const satisfies ReadonlyArray<keyof VolatileState>;

/**
 * state から keys のキーだけを取り出した patch を返す（引き継ぎ用）
 */
const pickPatch = (
  state: VolatileState,
  keys: ReadonlyArray<keyof VolatileState>,
): StatePatch<VolatileState> => {
  const patch: Partial<Record<keyof VolatileState, unknown>> = {};
  for (const key of keys) {
    if (state[key] !== undefined) {
      patch[key] = state[key];
    }
  }
  return patch as StatePatch<VolatileState>;
};

/**
 * バトンタッチで次のポケモンに書く patch を返す
 * 引っ込む前の状態（state）から BATON_PASS_KEYS だけを取り出す。
 * 使い方: 引っ込む前に読んでおき、場に出たあとで patchVolatileState(next.id, batonPassPatch(state))
 */
export const batonPassPatch = (state: VolatileState): StatePatch<VolatileState> =>
  pickPatch(state, BATON_PASS_KEYS);

/**
 * しっぽきりで次のポケモンに書く patch を返す（みがわりだけを引き継ぐ）
 */
export const shedTailPatch = (state: VolatileState): StatePatch<VolatileState> =>
  pickPatch(state, ['substituteHp']);

/**
 * ターン終了時の VolatileState を返す
 * 残りターン数を 1 減らして 0 になったキーを消し、このターンだけのフラグを消す。
 * さわぐが終わったあと（lockedInMove がない uproar）も消す
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
  // さわぐは、最後のターンのターン終了時まで場の誰も眠れない（本家の uproar は residual の最後で終わる）
  if (state.uproar !== undefined && state.lockedInMove === undefined) {
    markRemoved(patch, 'uproar');
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
 * そのポケモンによる「逃げられない」「たこがため」「メロメロ」「バインド状態」を消す
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
  if (state.partialTrap?.sourceStatusId === statusId) {
    patch.partialTrap = undefined;
  }
  return applyIfChanged(state, patch);
};
