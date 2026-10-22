/**
 * 種族値（HP を含む）
 */
export type BaseStatValues = {
  readonly hp: number;
  readonly attack: number;
  readonly defense: number;
  readonly specialAttack: number;
  readonly specialDefense: number;
  readonly speed: number;
};

/**
 * バトル中に変わるフォルム 1 つ分（タイプと種族値）
 */
export interface PokemonForm {
  /** 全国図鑑の番号（Pokemon.nationalDex） */
  readonly nationalDex: number;
  /** フォルム名（volatileState.form / persistentState.form に書く値） */
  readonly form: string;
  /** タイプ名（DB の Type.name） */
  readonly types: readonly string[];
  readonly baseStats: BaseStatValues;
  /**
   * 種族の既定のフォルム（バトルに出たときのフォルム）。全国図鑑の番号ごとに 1 つ
   * フォルムを書いていないポケモンは、このフォルムのタイプと種族値を使う
   */
  readonly isDefault?: boolean;
  /**
   * このフォルムの特性名（DB の Ability.name）。交代しても残るフォルム（persistentState.form）のときだけ、
   * もとの特性の代わりになる（本家の永続の formeChange が baseAbility を書き換える。テラパゴスのテラスタルフォルム）
   * 書いていないフォルムは、もとの特性のまま
   */
  readonly abilityName?: string;
}

const stats = (
  hp: number,
  attack: number,
  defense: number,
  specialAttack: number,
  specialDefense: number,
  speed: number,
): BaseStatValues => ({ hp, attack, defense, specialAttack, specialDefense, speed });

/**
 * バトル中にフォルムが変わるポケモンの、フォルムごとのタイプと種族値（Pokemon Showdown の data/pokedex.ts）
 *
 * DB の Pokemon は全国図鑑の番号ごとに 1 行しかなく、別のフォルムの種族値を持たない（古いシードは番号で upsert して
 * いたので、最後に読んだ別のフォルムの値が残っていることもある）。そのため、フォルムの値はこの表から引く。
 * フォルムを書いていない（form がない）ポケモンは、表の既定のフォルム（isDefault）の値を使い、表にないポケモンだけ DB の値を使う
 */
export const POKEMON_FORMS: readonly PokemonForm[] = [
  // ギルガルド（バトルスイッチ）
  {
    nationalDex: 681,
    form: 'shield',
    isDefault: true,
    types: ['はがね', 'ゴースト'],
    baseStats: stats(60, 50, 140, 50, 140, 60),
  },
  {
    nationalDex: 681,
    form: 'blade',
    types: ['はがね', 'ゴースト'],
    baseStats: stats(60, 140, 50, 140, 50, 60),
  },
  // ヒヒダルマ（ダルマモード）。ガラルのすがたは 'galar-standard' / 'galar-zen'（DB は既定のすがただけなので、今は使わない）
  {
    nationalDex: 555,
    form: 'standard',
    isDefault: true,
    types: ['ほのお'],
    baseStats: stats(105, 140, 55, 30, 55, 95),
  },
  {
    nationalDex: 555,
    form: 'zen',
    types: ['ほのお', 'エスパー'],
    baseStats: stats(105, 30, 105, 140, 105, 55),
  },
  {
    nationalDex: 555,
    form: 'galar-standard',
    types: ['こおり'],
    baseStats: stats(105, 140, 55, 30, 55, 95),
  },
  {
    nationalDex: 555,
    form: 'galar-zen',
    types: ['こおり', 'ほのお'],
    baseStats: stats(105, 160, 55, 30, 55, 135),
  },
  // メテノ（リミットシールド）
  {
    nationalDex: 774,
    form: 'core',
    types: ['いわ', 'ひこう'],
    baseStats: stats(60, 100, 60, 100, 60, 120),
  },
  {
    nationalDex: 774,
    form: 'meteor',
    isDefault: true,
    types: ['いわ', 'ひこう'],
    baseStats: stats(60, 60, 100, 60, 100, 60),
  },
  // ヨワシ（ぎょぐん）
  {
    nationalDex: 746,
    form: 'solo',
    isDefault: true,
    types: ['みず'],
    baseStats: stats(45, 20, 20, 25, 25, 40),
  },
  {
    nationalDex: 746,
    form: 'school',
    types: ['みず'],
    baseStats: stats(45, 140, 130, 140, 135, 30),
  },
  // ミミッキュ（ばけのかわ）
  {
    nationalDex: 778,
    form: 'disguised',
    isDefault: true,
    types: ['ゴースト', 'フェアリー'],
    baseStats: stats(55, 90, 80, 50, 105, 96),
  },
  {
    nationalDex: 778,
    form: 'busted',
    types: ['ゴースト', 'フェアリー'],
    baseStats: stats(55, 90, 80, 50, 105, 96),
  },
  // コオリッポ（アイスフェイス）
  {
    nationalDex: 875,
    form: 'ice',
    isDefault: true,
    types: ['こおり'],
    baseStats: stats(75, 80, 110, 65, 90, 50),
  },
  { nationalDex: 875, form: 'noice', types: ['こおり'], baseStats: stats(75, 80, 70, 65, 50, 130) },
  // モルペコ（はらぺこスイッチ）
  {
    nationalDex: 877,
    form: 'full-belly',
    isDefault: true,
    types: ['でんき', 'あく'],
    baseStats: stats(58, 95, 58, 70, 58, 97),
  },
  {
    nationalDex: 877,
    form: 'hangry',
    types: ['でんき', 'あく'],
    baseStats: stats(58, 95, 58, 70, 58, 97),
  },
  // ジガルデ（スワームチェンジ）
  {
    nationalDex: 718,
    form: '50',
    isDefault: true,
    types: ['ドラゴン', 'じめん'],
    baseStats: stats(108, 100, 121, 81, 95, 95),
  },
  {
    nationalDex: 718,
    form: '10',
    types: ['ドラゴン', 'じめん'],
    baseStats: stats(54, 100, 71, 61, 85, 115),
  },
  {
    nationalDex: 718,
    form: 'complete',
    types: ['ドラゴン', 'じめん'],
    baseStats: stats(216, 100, 121, 91, 95, 85),
  },
  // ウッウ（うのミサイル）
  {
    nationalDex: 845,
    form: 'gulping',
    types: ['ひこう', 'みず'],
    baseStats: stats(70, 85, 55, 85, 95, 85),
  },
  {
    nationalDex: 845,
    form: 'gorging',
    types: ['ひこう', 'みず'],
    baseStats: stats(70, 85, 55, 85, 95, 85),
  },
  // ポワルン（てんきや）
  {
    nationalDex: 351,
    form: 'normal',
    isDefault: true,
    types: ['ノーマル'],
    baseStats: stats(70, 70, 70, 70, 70, 70),
  },
  { nationalDex: 351, form: 'sunny', types: ['ほのお'], baseStats: stats(70, 70, 70, 70, 70, 70) },
  { nationalDex: 351, form: 'rainy', types: ['みず'], baseStats: stats(70, 70, 70, 70, 70, 70) },
  { nationalDex: 351, form: 'snowy', types: ['こおり'], baseStats: stats(70, 70, 70, 70, 70, 70) },
  // チェリム（フラワーギフト）
  {
    nationalDex: 421,
    form: 'overcast',
    isDefault: true,
    types: ['くさ'],
    baseStats: stats(70, 60, 70, 87, 78, 85),
  },
  { nationalDex: 421, form: 'sunshine', types: ['くさ'], baseStats: stats(70, 60, 70, 87, 78, 85) },
  // イルカマン（マイティチェンジ）
  {
    nationalDex: 964,
    form: 'zero',
    isDefault: true,
    types: ['みず'],
    baseStats: stats(100, 70, 72, 53, 62, 100),
  },
  { nationalDex: 964, form: 'hero', types: ['みず'], baseStats: stats(100, 160, 97, 106, 87, 100) },
  // テラパゴス（テラスチェンジ）。テラスタルフォルムは交代しても残り、特性がテラスシェルになる
  {
    nationalDex: 1024,
    form: 'normal',
    isDefault: true,
    types: ['ノーマル'],
    baseStats: stats(90, 65, 85, 65, 85, 60),
  },
  {
    nationalDex: 1024,
    form: 'terastal',
    types: ['ノーマル'],
    baseStats: stats(95, 95, 110, 105, 110, 85),
    abilityName: 'テラスシェル',
  },
];

/**
 * 全国図鑑の番号とフォルム名から、フォルムを引く（ないときは undefined）
 * form が undefined なら undefined（既定のフォルムも引くときは resolvePokemonForm）
 */
export const findPokemonForm = (
  nationalDex: number,
  form: string | undefined,
): PokemonForm | undefined =>
  form === undefined
    ? undefined
    : POKEMON_FORMS.find(entry => entry.nationalDex === nationalDex && entry.form === form);

/**
 * 種族の既定のフォルム（表の isDefault）。表にないポケモンは undefined
 */
export const defaultPokemonForm = (nationalDex: number): PokemonForm | undefined =>
  POKEMON_FORMS.find(entry => entry.nationalDex === nationalDex && entry.isDefault === true);

/**
 * 今のフォルムの値を引く。form が undefined（フォルムを書いていない）なら既定のフォルム
 * 表にないフォルム・表にないポケモンは undefined（DB の値を使う）
 */
export const resolvePokemonForm = (
  nationalDex: number,
  form: string | undefined,
): PokemonForm | undefined =>
  form === undefined ? defaultPokemonForm(nationalDex) : findPokemonForm(nationalDex, form);
