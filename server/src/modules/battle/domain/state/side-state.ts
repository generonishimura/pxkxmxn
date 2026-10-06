import {
  FieldParsers,
  StatePatch,
  applyStatePatch,
  booleanValue,
  integerInRange,
  isEmptyObject,
  isPlainObject,
  nonNegativeInteger,
  parseFields,
  positiveInteger,
  requiredFieldsOf,
} from './state-field-parser';

/**
 * ねがいごと。turns ターン後のターン終了時に、その陣営の場のポケモンを healAmount 回復する
 */
export type PendingWish = {
  readonly turns: number;
  readonly healAmount: number;
};

/**
 * 片方の陣営だけにかかる場の状態
 * 〜Turns は残りターン数、〜Layers は重ねた回数
 */
export type SideConditions = {
  // ---- 壁・守り（ターン数） ----
  /** リフレクター */
  readonly reflectTurns?: number;
  /** ひかりのかべ */
  readonly lightScreenTurns?: number;
  /** オーロラベール */
  readonly auroraVeilTurns?: number;
  /** おいかぜ */
  readonly tailwindTurns?: number;
  /** しんぴのまもり */
  readonly safeguardTurns?: number;
  /** しろいきり */
  readonly mistTurns?: number;
  /** おまじない */
  readonly luckyChantTurns?: number;

  // ---- 設置技（交代で出てきたポケモンに効く） ----
  /** まきびし（1〜3） */
  readonly spikesLayers?: number;
  /** どくびし（1〜2） */
  readonly toxicSpikesLayers?: number;
  /** ステルスロック */
  readonly stealthRock?: boolean;
  /** ねばねばネット */
  readonly stickyWeb?: boolean;

  // ---- このターンだけ陣営全体を守る ----
  /** ワイドガード */
  readonly wideGuard?: boolean;
  /** ファストガード */
  readonly quickGuard?: boolean;
  /** トリックガード */
  readonly craftyShield?: boolean;
  /** たたみがえし */
  readonly matBlock?: boolean;

  // ---- 遅れて効く効果 ----
  /** ねがいごと */
  readonly wish?: PendingWish;
  /** みかづきのまい。次に出てきたポケモンを全回復する */
  readonly lunarDancePending?: boolean;
};

/**
 * 両陣営にかかる、時間で終わる場の状態
 * 天候とフィールドの種類は Battle.weather / Battle.field が持つ。ここには残りターン数などを置く
 */
export type GlobalFieldState = {
  /** トリックルーム */
  readonly trickRoomTurns?: number;
  /** じゅうりょく */
  readonly gravityTurns?: number;
  /** ワンダールーム */
  readonly wonderRoomTurns?: number;
  /** マジックルーム */
  readonly magicRoomTurns?: number;
  /** どろあそび */
  readonly mudSportTurns?: number;
  /** みずあそび */
  readonly waterSportTurns?: number;
  /** フェアリーロック */
  readonly fairyLockTurns?: number;
  /** Battle.field のフィールドの残りターン数 */
  readonly terrainTurns?: number;
  /** プラズマシャワー（このターンだけ、ノーマル技がでんき技になる） */
  readonly ionDeluge?: boolean;
  /** バトル全体で最後に使われた技（まねっこが読む） */
  readonly lastMoveId?: number;
};

/**
 * バトル全体の場の状態（Battle.sideState）
 *
 * - sides のキーはトレーナー ID を 10 進の文字列にしたもの（JSON のキーは文字列のため）
 * - すべてのキーは任意。空になった陣営や global はキーごと消す
 */
export type SideState = {
  readonly sides?: { readonly [trainerId: string]: SideConditions };
  readonly global?: GlobalFieldState;
};

const pendingWish = requiredFieldsOf<PendingWish>({
  turns: nonNegativeInteger,
  healAmount: positiveInteger,
});

/**
 * SideConditions の全キーの読み方
 * SideConditions にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
const SIDE_CONDITIONS_PARSERS: FieldParsers<SideConditions> = {
  reflectTurns: nonNegativeInteger,
  lightScreenTurns: nonNegativeInteger,
  auroraVeilTurns: nonNegativeInteger,
  tailwindTurns: nonNegativeInteger,
  safeguardTurns: nonNegativeInteger,
  mistTurns: nonNegativeInteger,
  luckyChantTurns: nonNegativeInteger,
  spikesLayers: integerInRange(1, 3),
  toxicSpikesLayers: integerInRange(1, 2),
  stealthRock: booleanValue,
  stickyWeb: booleanValue,
  wideGuard: booleanValue,
  quickGuard: booleanValue,
  craftyShield: booleanValue,
  matBlock: booleanValue,
  wish: pendingWish,
  lunarDancePending: booleanValue,
};

/**
 * GlobalFieldState の全キーの読み方
 * GlobalFieldState にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
const GLOBAL_FIELD_STATE_PARSERS: FieldParsers<GlobalFieldState> = {
  trickRoomTurns: nonNegativeInteger,
  gravityTurns: nonNegativeInteger,
  wonderRoomTurns: nonNegativeInteger,
  magicRoomTurns: nonNegativeInteger,
  mudSportTurns: nonNegativeInteger,
  waterSportTurns: nonNegativeInteger,
  fairyLockTurns: nonNegativeInteger,
  terrainTurns: nonNegativeInteger,
  ionDeluge: booleanValue,
  lastMoveId: positiveInteger,
};

/**
 * トレーナー ID として読める sides のキー（1 以上の整数の 10 進表記）
 */
const TRAINER_ID_KEY = /^[1-9][0-9]*$/;

/**
 * 何の状態も持たない SideState を返す
 */
export const emptySideState = (): SideState => ({});

/**
 * トレーナーの陣営の状態を返す。何もなければ空の状態を返す
 */
export const getSideConditions = (state: SideState, trainerId: number): SideConditions =>
  state.sides?.[String(trainerId)] ?? {};

/**
 * 両陣営にかかる場の状態を返す。何もなければ空の状態を返す
 */
export const getGlobalFieldState = (state: SideState): GlobalFieldState => state.global ?? {};

/**
 * 元の状態を書き換えずに、トレーナーの陣営に patch を当てた新しい SideState を返す
 * undefined か null を渡したキーは取り除き、空になった陣営はキーごと取り除く
 */
export const updateSideConditions = (
  state: SideState,
  trainerId: number,
  patch: StatePatch<SideConditions>,
): SideState => {
  const key = String(trainerId);
  const conditions: SideConditions = applyStatePatch(getSideConditions(state, trainerId), patch);
  const sides = applyStatePatch(state.sides ?? {}, {
    [key]: isEmptyObject(conditions) ? undefined : conditions,
  });
  return applyStatePatch(state, { sides: isEmptyObject(sides) ? undefined : sides });
};

/**
 * 元の状態を書き換えずに、両陣営にかかる場の状態に patch を当てた新しい SideState を返す
 * undefined か null を渡したキーは取り除き、空になったら global ごと取り除く
 */
export const updateGlobalFieldState = (
  state: SideState,
  patch: StatePatch<GlobalFieldState>,
): SideState => {
  const global: GlobalFieldState = applyStatePatch(getGlobalFieldState(state), patch);
  return applyStatePatch(state, { global: isEmptyObject(global) ? undefined : global });
};

/**
 * sides を読む。トレーナー ID として読めないキーと、中身が空になった陣営は捨てる
 */
const parseSides = (value: unknown): SideState['sides'] => {
  if (!isPlainObject(value)) {
    return undefined;
  }
  const sides: { [trainerId: string]: SideConditions } = {};
  for (const [key, conditionsJson] of Object.entries(value)) {
    if (!TRAINER_ID_KEY.test(key)) {
      continue;
    }
    const conditions = parseFields(conditionsJson, SIDE_CONDITIONS_PARSERS);
    if (!isEmptyObject(conditions)) {
      sides[key] = conditions;
    }
  }
  return isEmptyObject(sides) ? undefined : sides;
};

/**
 * DB の JSON 列から SideState を読む
 * 例外は投げない。オブジェクトでない値は空の状態にし、知らないキーと型が合わないキーは捨てる
 */
export const parseSideState = (json: unknown): SideState => {
  if (!isPlainObject(json)) {
    return emptySideState();
  }
  const sides = parseSides(json.sides);
  const global = parseFields(json.global, GLOBAL_FIELD_STATE_PARSERS);
  return applyStatePatch(emptySideState(), {
    sides,
    global: isEmptyObject(global) ? undefined : global,
  });
};
