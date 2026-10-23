import {
  FieldParsers,
  StatePatch,
  applyStatePatch,
  booleanValue,
  nonEmptyString,
  nonNegativeInteger,
  parseFields,
  positiveInteger,
} from './state-field-parser';

/**
 * 交代しても消えない、ポケモンごとの状態（BattlePokemonStatus.persistentState）
 *
 * VolatileState は交代で引っ込むとすべて消える。こちらはバトルが終わるまで残る
 * - すべてのキーは任意。キーがないことは「その状態ではない」を意味する
 * - ひんしになっても消さない（さいきのいのりで復活したときに引き継ぐ）
 */
export type PersistentPokemonState = {
  /**
   * ねむる（Rest）で眠っている間の、残りの動けないターン数（ねむるが 3 を書く）。ねむりでなくなったらキーを消す
   * キーがあるねむりは固定のターン数で、ターン終了時の確率での解除をしない。キーがないねむりは確率で解除する
   */
  readonly sleepTurns?: number;
  /** こおりで動けなかった回数。3 回目の行動では必ず解ける。こおりでなくなったらキーを消す */
  readonly freezeTurns?: number;
  /**
   * 交代しても戻らないフォルム（マイティチェンジの 'hero'・きずなへんげの 'ash'・スワームチェンジの 'complete' など）
   * 交代で戻るフォルムは VolatileState.form に置く
   */
  readonly form?: string;
  /** ばけのかわが破れた（交代しても戻らない） */
  readonly disguiseBusted?: boolean;
  /** アイスフェイスが壊れた（交代しても戻らない。ゆきで戻る） */
  readonly iceFaceBroken?: boolean;
  /** 1 バトルに 1 回だけの特性を使った（ふとうのけん・ふくつのたて・きずなへんげ） */
  readonly oncePerBattleAbilityUsed?: boolean;

  // ---- 場の状態・設置技・交代の仕組み（Issue #103 #135 一部） ----
  /**
   * さいきのいのりで復活した回数（エンジンが書く）
   * 陣営でひんしになった延べ数（そうだいしょう）を、今ひんしの数 + 復活した回数で求めるのに使う
   */
  readonly revivalCount?: number;

  // ---- 持ち物（Issue #245） ----
  /** 今持っている持ち物の名前（DB の持ち物の日本語名）。持っていなければキーがない */
  readonly item?: string;
  /** 最後に使い切った持ち物の名前（きのみを食べた など）。リサイクル・しゅうかく・かるわざが読む */
  readonly consumedItem?: string;
};

/**
 * PersistentPokemonState の全キーの読み方
 * PersistentPokemonState にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
export const PERSISTENT_POKEMON_STATE_PARSERS: FieldParsers<PersistentPokemonState> = {
  sleepTurns: nonNegativeInteger,
  freezeTurns: nonNegativeInteger,
  form: nonEmptyString,
  disguiseBusted: booleanValue,
  iceFaceBroken: booleanValue,
  oncePerBattleAbilityUsed: booleanValue,
  revivalCount: positiveInteger,
  item: nonEmptyString,
  consumedItem: nonEmptyString,
};

/**
 * 何の状態も持たない PersistentPokemonState を返す
 */
export const emptyPersistentPokemonState = (): PersistentPokemonState => ({});

/**
 * 元の状態を書き換えずに、patch を当てた新しい PersistentPokemonState を返す
 * undefined か null を渡したキーは取り除く
 */
export const updatePersistentPokemonState = (
  state: PersistentPokemonState,
  patch: StatePatch<PersistentPokemonState>,
): PersistentPokemonState => applyStatePatch(state, patch);

/**
 * DB の JSON 列から PersistentPokemonState を読む
 * 例外は投げない。オブジェクトでない値は空の状態にし、知らないキーと型が合わないキーは捨てる
 */
export const parsePersistentPokemonState = (json: unknown): PersistentPokemonState =>
  parseFields(json, PERSISTENT_POKEMON_STATE_PARSERS);
