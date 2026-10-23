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

export const CHAMPIONS_MOVE_OVERRIDES: Readonly<Record<string, MoveOverride>> = {
  // 威力（チャンピオンズの値。SV の値はコメントに書く）
  りんごさん: { power: 90 }, // Apple Acid。SV は 80
  くちばしキャノン: { power: 120 }, // Beak Blast。SV は 100
  ボーンラッシュ: { power: 30 }, // Bone Rush。SV は 25
  ほのおのムチ: { power: 90 }, // Fire Lash。SV は 80
  であいがしら: { power: 100 }, // First Impression。SV は 90
  Ｇのちから: { power: 90 }, // Grav Apple（Ｇ は全角）。SV は 80
  ひゃっきやこう: { power: 65 }, // Infernal Parade。SV は 60
  ナイトバースト: { power: 90 }, // Night Daze。SV は 85
  ひょうざんおろし: { power: 120 }, // Mountain Gale。SV は 100
  バリアーラッシュ: { power: 90 }, // Psyshield Bash。SV は 70
  かげぬい: { power: 90 }, // Spirit Shackle。SV は 80
  トロピカルキック: { power: 85 }, // Trop Kick。SV は 70
  きりさく: { power: 80 }, // Slash。SV は 70
  ねらいうち: { power: 85 }, // Snipe Shot。SV は 80
  スターアサルト: { power: 170 }, // Collision Course。SV は 150
  // 命中（チャンピオンズの値）
  クラブハンマー: { accuracy: 95 }, // Crabhammer。SV は 90
  みずあめボム: { accuracy: 90 }, // Syrup Bomb。SV は 85
  ゴールドラッシュ: { accuracy: 95 }, // Make It Rain。SV は 100
  // タイプ（チャンピオンズの値）
  せいちょう: { typeName: 'grass' }, // Growth。SV はノーマル
  トラバサミ: { typeName: 'steel' }, // Snap Trap。SV はくさ
  // PP（チャンピオンズの値）
  ねがいごと: { pp: 8 }, // Wish。SV（PokeAPI）は 10
  ちからをすいとる: { pp: 8 }, // Strength Sap。SV（PokeAPI）は 10
};

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
