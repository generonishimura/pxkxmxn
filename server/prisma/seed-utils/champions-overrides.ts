import { MoveSeedData } from './data-mapper';

/**
 * チャンピオンズで値が変わった技の上書き
 *
 * PokeAPI の値は SV（スカーレット・バイオレット）のもの。seed で DB に入れる前に、ここの値で上書きする。
 * すでに seed した DB には、`npm run apply:champions-overrides` で上書きだけを当てられる。
 *
 * キーは技の日本語名（DB の name と同じ、PokeAPI の ja-Hrkt 名）。
 * どの技にも当たらないキーは、seed のログに出る（名前の書き間違いを見つけるため）。
 */
export interface MoveOverride {
  readonly power?: number | null;
  readonly accuracy?: number | null;
  readonly pp?: number;
  /** PokeAPI のタイプ名（'grass' など） */
  readonly typeName?: string;
  readonly priority?: number;
}

/**
 * 上書きできる技の値
 */
export type OverridableMoveValues = Pick<
  MoveSeedData,
  'power' | 'accuracy' | 'pp' | 'typeName' | 'priority'
>;

export const CHAMPIONS_MOVE_OVERRIDES: Readonly<Record<string, MoveOverride>> = {};

/**
 * 上書きを比べる項目の順番（ログの順番もこれに合わせる）
 */
const OVERRIDE_KEYS = ['typeName', 'power', 'accuracy', 'pp', 'priority'] as const;

/**
 * 今の値に上書きを当てて、変わったあとの値と、変わった項目の説明を返す
 * 上書きの値が今の値と同じ項目は、変わった項目に数えない
 */
export const diffMoveOverride = <T extends OverridableMoveValues>(
  current: T,
  override: MoveOverride,
): { next: T; changes: string[] } => {
  const next = { ...current };
  const changes: string[] = [];
  for (const key of OVERRIDE_KEYS) {
    if (!(key in override)) {
      continue;
    }
    const value = override[key];
    if (value === current[key]) {
      continue;
    }
    (next as OverridableMoveValues)[key] = value as never;
    changes.push(`${key}: ${String(current[key])} → ${String(value)}`);
  }
  return { next, changes };
};

/**
 * PokeAPI から作った技の seed データに、チャンピオンズの上書きを当てる
 */
export const applyMoveOverride = (
  seed: MoveSeedData,
  overrides: Readonly<Record<string, MoveOverride>> = CHAMPIONS_MOVE_OVERRIDES,
): { seed: MoveSeedData; changes: string[] } => {
  const override = overrides[seed.name];
  if (!override) {
    return { seed, changes: [] };
  }
  const { next, changes } = diffMoveOverride(seed, override);
  return { seed: next, changes };
};

/**
 * 上書きの表のキーのうち、どの技の名前にも当たらなかったものを返す
 */
export const findUnusedOverrideNames = (
  overrides: Readonly<Record<string, MoveOverride>>,
  seenNames: ReadonlySet<string>,
): string[] => Object.keys(overrides).filter(name => !seenNames.has(name));
