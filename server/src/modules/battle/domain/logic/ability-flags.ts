/**
 * 特性の書き換え・消去で使うフラグ（Pokemon Showdown の data/abilities.ts の flags と同じ）
 * - cantSuppress: いえき・かがくへんかガスで消えない。スキルスワップなどで書き換えられない（本家の cantsuppress）
 * - failRolePlay: なりきり・うつしえで写せない
 * - noReceiver: レシーバー・かがくのちからで受け継げない
 * - noEntrain: なかまづくりで相手に写せない（使用者の特性）
 * - noTrace: トレースで写せない
 * - failSkillSwap: スキルスワップ・さまようたましいで入れ替えられない
 * - noTransform: へんしん中は効かない（ばけのかわ・アイスフェイスなど）
 */
export type AbilityFlag =
  | 'cantSuppress'
  | 'failRolePlay'
  | 'noReceiver'
  | 'noEntrain'
  | 'noTrace'
  | 'failSkillSwap'
  | 'noTransform';

/** 写せない・受け継げない特性に共通のフラグ */
const NOT_COPYABLE = ['failRolePlay', 'noReceiver', 'noEntrain', 'noTrace'] as const;
/** 写せず、入れ替えもできない特性 */
const NOT_SWAPPABLE = [...NOT_COPYABLE, 'failSkillSwap'] as const;
/** 写せず、入れ替えも消去もできない特性 */
const PERMANENT = [...NOT_SWAPPABLE, 'cantSuppress'] as const;

/**
 * 特性名（PokeAPI の ja-Hrkt。DB の name）ごとのフラグ。表にない特性はフラグを持たない
 * 第 9 世代の Showdown の flags を写した（breakable はかたやぶりの仕組みで扱うので入れない）
 */
export const ABILITY_FLAGS: Readonly<Record<string, readonly AbilityFlag[]>> = {
  じんばいったい: PERMANENT,
  きずなへんげ: PERMANENT,
  ぜったいねむり: PERMANENT,
  しれいとう: NOT_SWAPPABLE,
  ばけのかわ: [...PERMANENT, 'noTransform'],
  おもかげやどし: [...NOT_SWAPPABLE, 'noTransform'],
  フラワーギフト: NOT_COPYABLE,
  てんきや: NOT_COPYABLE,
  うのミサイル: ['cantSuppress', 'noTransform'],
  はらぺこスイッチ: [...NOT_SWAPPABLE, 'noTransform'],
  アイスフェイス: [...PERMANENT, 'noTransform'],
  イリュージョン: NOT_SWAPPABLE,
  かわりもの: NOT_COPYABLE,
  マルチタイプ: PERMANENT,
  かがくへんかガス: [...NOT_SWAPPABLE, 'noTransform'],
  どくくぐつ: NOT_SWAPPABLE,
  スワームチェンジ: PERMANENT,
  かがくのちから: NOT_COPYABLE,
  こだいかっせい: [...NOT_SWAPPABLE, 'noTransform'],
  クォークチャージ: [...NOT_SWAPPABLE, 'noTransform'],
  レシーバー: NOT_COPYABLE,
  ＡＲシステム: PERMANENT,
  ぎょぐん: PERMANENT,
  リミットシールド: PERMANENT,
  バトルスイッチ: PERMANENT,
  ゼロフォーミング: NOT_SWAPPABLE,
  テラスシェル: NOT_SWAPPABLE,
  テラスチェンジ: [...PERMANENT, 'noTransform'],
  トレース: NOT_COPYABLE,
  ふしぎなまもり: ['failRolePlay', 'noReceiver', 'noEntrain', 'failSkillSwap'],
  ダルマモード: PERMANENT,
  マイティチェンジ: [...PERMANENT, 'noTransform'],
};

/**
 * 特性がフラグを持つか（特性がないときは false）
 */
export const hasAbilityFlag = (abilityName: string | undefined, flag: AbilityFlag): boolean =>
  abilityName !== undefined && (ABILITY_FLAGS[abilityName]?.includes(flag) ?? false);
