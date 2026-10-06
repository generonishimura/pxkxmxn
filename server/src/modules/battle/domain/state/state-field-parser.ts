/**
 * DB の JSON 列から読んだ値を、型付きの状態に直すための小さな部品
 *
 * どの部品も例外を投げない。読めない値は undefined を返し、呼び出し側でそのキーを捨てる。
 * 古い行や、新しいコードが書いた知らないキーがあっても、バトルを止めないため。
 */

/**
 * 1 つの値を検査する関数。読めない値なら undefined を返す
 */
export type FieldParser<T> = (value: unknown) => T | undefined;

/**
 * オブジェクト型 T の全キーに対応する FieldParser の表
 * T にキーを足すと、ここにも parser を足さないとコンパイルが通らない
 */
export type FieldParsers<T> = { readonly [K in keyof T]-?: FieldParser<NonNullable<T[K]>> };

/**
 * 状態の部分更新。undefined か null を渡したキーは取り除く
 */
export type StatePatch<T> = { readonly [K in keyof T]?: T[K] | null };

/**
 * 組み立てている途中の StatePatch（キーを 1 つずつ足すため readonly を外したもの）
 */
export type MutableStatePatch<T> = { -readonly [K in keyof T]?: T[K] | null };

/**
 * T のキーのうち、値の型が V のもの
 */
export type KeysOfType<T, V> = {
  [K in keyof T]-?: NonNullable<T[K]> extends V ? K : never;
}[keyof T];

/**
 * 組み立てている patch に「key を取り除く」を足す
 * 値の型が違うキーをまとめて回すとき、patch[key] = undefined と直接書くと型が合わないため
 */
export const markRemoved = <T, K extends keyof T>(patch: MutableStatePatch<T>, key: K): void => {
  patch[key] = undefined;
};

/**
 * keys をすべて取り除く patch を返す（リポジトリの部分更新に渡す）
 */
export const removalPatch = <T>(keys: ReadonlyArray<keyof T>): StatePatch<T> => {
  const patch: MutableStatePatch<T> = {};
  for (const key of keys) {
    markRemoved(patch, key);
  }
  return patch;
};

/**
 * 残りターン数を 1 減らした値を返す。0 になるなら undefined（キーを消す）を返す
 */
export const tickTurnCount = (turns: number): number | undefined =>
  turns > 1 ? turns - 1 : undefined;

/**
 * 配列でも null でもないオブジェクトかどうか
 */
export const isPlainObject = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * min 以上 max 以下の整数だけを通す
 */
export const integerInRange =
  (min: number, max: number = Number.MAX_SAFE_INTEGER): FieldParser<number> =>
  value =>
    typeof value === 'number' && Number.isInteger(value) && value >= min && value <= max
      ? value
      : undefined;

/**
 * 0 以上の整数（残りターン数・回数など）
 */
export const nonNegativeInteger: FieldParser<number> = integerInRange(0);

/**
 * 1 以上の整数（ID・HP・実数値など）
 */
export const positiveInteger: FieldParser<number> = integerInRange(1);

/**
 * 真偽値だけを通す
 */
export const booleanValue: FieldParser<boolean> = value =>
  typeof value === 'boolean' ? value : undefined;

/**
 * 空でない文字列だけを通す
 */
export const nonEmptyString: FieldParser<string> = value =>
  typeof value === 'string' && value.length > 0 ? value : undefined;

/**
 * 決められた文字列のどれかだけを通す
 */
export const oneOf =
  <T extends string>(values: readonly T[]): FieldParser<T> =>
  value =>
    values.find(candidate => candidate === value);

/**
 * すべての要素が読める配列だけを通す。1 つでも読めない要素があれば配列ごと捨てる
 */
export const arrayOf =
  <T>(item: FieldParser<T>): FieldParser<readonly T[]> =>
  value => {
    if (!Array.isArray(value)) {
      return undefined;
    }
    const items: T[] = [];
    for (const element of value) {
      const parsed = item(element);
      if (parsed === undefined) {
        return undefined;
      }
      items.push(parsed);
    }
    return items;
  };

/**
 * 表にあるキーだけを読み、読めたキーだけを持つオブジェクトを返す
 * 表にないキーは捨てる
 */
export const parseFields = <T extends object>(
  value: unknown,
  parsers: FieldParsers<T>,
): Partial<T> => {
  const result: Partial<T> = {};
  if (!isPlainObject(value)) {
    return result;
  }
  for (const key of Object.keys(parsers) as Array<keyof T & string>) {
    const parsed = parsers[key](value[key]);
    if (parsed !== undefined) {
      result[key] = parsed;
    }
  }
  return result;
};

/**
 * すべてのキーが任意のオブジェクトを読む。読めたキーが 1 つもなければキーごと捨てる
 */
export const optionalFieldsOf =
  <T extends object>(parsers: FieldParsers<T>): FieldParser<Partial<T>> =>
  value => {
    const parsed = parseFields(value, parsers);
    return isEmptyObject(parsed) ? undefined : parsed;
  };

/**
 * すべてのキーが必須のオブジェクトを読む。1 つでも欠けていればキーごと捨てる
 */
export const requiredFieldsOf =
  <T extends object>(parsers: FieldParsers<T>): FieldParser<T> =>
  value => {
    const parsed = parseFields(value, parsers);
    const complete = Object.keys(parsers).every(key => key in parsed);
    return complete ? (parsed as T) : undefined;
  };

/**
 * キーを 1 つも持たないかどうか
 */
export const isEmptyObject = (value: object): boolean => Object.keys(value).length === 0;

/**
 * 元の状態を書き換えずに、patch を当てた新しい状態を返す
 * undefined か null を渡したキーは取り除く（JSON に空のキーを残さないため）
 */
export const applyStatePatch = <T extends object>(state: T, patch: StatePatch<T>): Partial<T> => {
  const next: Partial<T> = { ...state };
  for (const key of Object.keys(patch) as Array<keyof T & string>) {
    const value = patch[key];
    if (value === undefined || value === null) {
      delete next[key];
    } else {
      next[key] = value;
    }
  }
  return next;
};
