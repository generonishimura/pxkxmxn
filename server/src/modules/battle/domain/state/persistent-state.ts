import {
  FieldParsers,
  StatePatch,
  applyStatePatch,
  booleanValue,
  nonEmptyString,
  nonNegativeInteger,
  parseFields,
} from './state-field-parser';

/**
 * 交代しても消えない、ポケモンごとの状態（BattlePokemonStatus.persistentState）
 *
 * VolatileState は交代で引っ込むとすべて消える。こちらはバトルが終わるまで残る
 * - すべてのキーは任意。キーがないことは「その状態ではない」を意味する
 * - ひんしになっても消さない（さいきのいのりで復活したときに引き継ぐ）
 */
export type PersistentPokemonState = {
  /** ねむりの残りターン数（交代しても続く）。ねむりでなくなったらキーを消す */
  readonly sleepTurns?: number;
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
};

/**
 * PersistentPokemonState の全キーの読み方
 * PersistentPokemonState にキーを足したら、ここにも足す（足さないとコンパイルが通らない）
 */
export const PERSISTENT_POKEMON_STATE_PARSERS: FieldParsers<PersistentPokemonState> = {
  sleepTurns: nonNegativeInteger,
  form: nonEmptyString,
  disguiseBusted: booleanValue,
  iceFaceBroken: booleanValue,
  oncePerBattleAbilityUsed: booleanValue,
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
