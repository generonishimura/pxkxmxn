import type { BaseStatValues } from './pokemon-forms';

/**
 * メガシンカした姿 1 つ分（メガストーンと、メガシンカしたあとのタイプ・種族値・特性）
 */
export interface MegaEvolution {
  /** メガシンカする種族の全国図鑑の番号（Pokemon.nationalDex） */
  readonly nationalDex: number;
  /** メガシンカする種族の名前（DB の Pokemon.name。表を読みやすくするためのもの） */
  readonly speciesName: string;
  /**
   * 姿の名前（persistentState.form に書く値）。PokeAPI の姿の名前（charizard-mega-x）から種族名を除いたもの
   * mega・mega-x・mega-y・mega-z のどれか
   */
  readonly form: string;
  /** メガストーンの名前（TrainedPokemon.heldItem と同じ。PokeAPI の ja-Hrkt 名、なければ ja 名） */
  readonly stoneName: string;
  /** タイプ名（DB の Type.name） */
  readonly types: readonly string[];
  readonly baseStats: BaseStatValues;
  /** 特性名（DB の Ability.name。日本語名がない特性は英語名） */
  readonly abilityName: string;
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
 * チャンピオンズで使えるメガシンカ（Serebii の Champions の持ち物一覧にあるメガストーン 81 個ぶん）
 *
 * タイプ・種族値・特性は PokeAPI の pokemon/<姿の名前> の値。レジェンズ Z-A とチャンピオンズで増えたメガシンカも
 * PokeAPI にあり、issue #262 の表（Game8 の値）と同じ値だった（mega-evolutions.spec.ts で比べている）
 * メガストーンの名前は PokeAPI の item/<名前> の ja-Hrkt 名。新しいメガストーンは ja-Hrkt 名がなく、ja 名を使う
 * （コメントに書いた。公式の表記と合っているかは、まだ確かめていない）
 *
 * PokeAPI にはあるが、チャンピオンズにメガストーンがないので入れていない姿:
 * ミュウツー X・Y、ラティアス、ラティオス、ディアンシー、レックウザ、ジガルデ、ヒードラン、ダークライ、マギアナ、
 * ゼラオラ、シャリタツ
 *
 * メガシンカした姿は、POKEMON_FORMS（pokemon-forms.ts）にも入る。persistentState.form にこの表の form を書けば、
 * タイプ・種族値・特性がメガシンカした姿のものになる
 */
export const MEGA_EVOLUTIONS: readonly MegaEvolution[] = [
  // フシギバナ（venusaur-mega）
  {
    nationalDex: 3,
    speciesName: 'フシギバナ',
    form: 'mega',
    stoneName: 'フシギバナイト',
    types: ['くさ', 'どく'],
    baseStats: stats(80, 100, 123, 122, 120, 80),
    abilityName: 'あついしぼう',
  },
  // リザードン（charizard-mega-x）
  {
    nationalDex: 6,
    speciesName: 'リザードン',
    form: 'mega-x',
    stoneName: 'リザードナイトＸ',
    types: ['ほのお', 'ドラゴン'],
    baseStats: stats(78, 130, 111, 130, 85, 100),
    abilityName: 'かたいツメ',
  },
  // リザードン（charizard-mega-y）
  {
    nationalDex: 6,
    speciesName: 'リザードン',
    form: 'mega-y',
    stoneName: 'リザードナイトＹ',
    types: ['ほのお', 'ひこう'],
    baseStats: stats(78, 104, 78, 159, 115, 100),
    abilityName: 'ひでり',
  },
  // カメックス（blastoise-mega）
  {
    nationalDex: 9,
    speciesName: 'カメックス',
    form: 'mega',
    stoneName: 'カメックスナイト',
    types: ['みず'],
    baseStats: stats(79, 103, 120, 135, 115, 78),
    abilityName: 'メガランチャー',
  },
  // スピアー（beedrill-mega）
  {
    nationalDex: 15,
    speciesName: 'スピアー',
    form: 'mega',
    stoneName: 'スピアナイト',
    types: ['むし', 'どく'],
    baseStats: stats(65, 150, 40, 15, 80, 145),
    abilityName: 'てきおうりょく',
  },
  // ピジョット（pidgeot-mega）
  {
    nationalDex: 18,
    speciesName: 'ピジョット',
    form: 'mega',
    stoneName: 'ピジョットナイト',
    types: ['ノーマル', 'ひこう'],
    baseStats: stats(83, 80, 80, 135, 80, 121),
    abilityName: 'ノーガード',
  },
  // ライチュウ（raichu-mega-x）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 26,
    speciesName: 'ライチュウ',
    form: 'mega-x',
    stoneName: 'ライチュウナイトＸ',
    types: ['でんき'],
    baseStats: stats(60, 135, 95, 90, 95, 110),
    abilityName: 'エレキメイカー',
  },
  // ライチュウ（raichu-mega-y）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 26,
    speciesName: 'ライチュウ',
    form: 'mega-y',
    stoneName: 'ライチュウナイトＹ',
    types: ['でんき'],
    baseStats: stats(60, 100, 55, 160, 80, 130),
    abilityName: 'ノーガード',
  },
  // ピクシー（clefable-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 36,
    speciesName: 'ピクシー',
    form: 'mega',
    stoneName: 'ピクシナイト',
    types: ['フェアリー', 'ひこう'],
    baseStats: stats(95, 80, 93, 135, 110, 70),
    abilityName: 'マジックミラー',
  },
  // フーディン（alakazam-mega）
  {
    nationalDex: 65,
    speciesName: 'フーディン',
    form: 'mega',
    stoneName: 'フーディナイト',
    types: ['エスパー'],
    baseStats: stats(55, 50, 65, 175, 105, 150),
    abilityName: 'トレース',
  },
  // ウツボット（victreebel-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 71,
    speciesName: 'ウツボット',
    form: 'mega',
    stoneName: 'ウツボットナイト',
    types: ['くさ', 'どく'],
    baseStats: stats(80, 125, 85, 135, 95, 70),
    abilityName: 'とびだすなかみ',
  },
  // ヤドラン（slowbro-mega）
  {
    nationalDex: 80,
    speciesName: 'ヤドラン',
    form: 'mega',
    stoneName: 'ヤドランナイト',
    types: ['みず', 'エスパー'],
    baseStats: stats(95, 75, 180, 130, 80, 30),
    abilityName: 'シェルアーマー',
  },
  // ゲンガー（gengar-mega）
  {
    nationalDex: 94,
    speciesName: 'ゲンガー',
    form: 'mega',
    stoneName: 'ゲンガナイト',
    types: ['ゴースト', 'どく'],
    baseStats: stats(60, 65, 80, 170, 95, 130),
    abilityName: 'かげふみ',
  },
  // ガルーラ（kangaskhan-mega）
  {
    nationalDex: 115,
    speciesName: 'ガルーラ',
    form: 'mega',
    stoneName: 'ガルーラナイト',
    types: ['ノーマル'],
    baseStats: stats(105, 125, 100, 60, 100, 100),
    abilityName: 'おやこあい',
  },
  // スターミー（starmie-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 121,
    speciesName: 'スターミー',
    form: 'mega',
    stoneName: 'スターミナイト',
    types: ['みず', 'エスパー'],
    baseStats: stats(60, 100, 105, 130, 105, 120),
    abilityName: 'ちからもち',
  },
  // カイロス（pinsir-mega）
  {
    nationalDex: 127,
    speciesName: 'カイロス',
    form: 'mega',
    stoneName: 'カイロスナイト',
    types: ['むし', 'ひこう'],
    baseStats: stats(65, 155, 120, 65, 90, 105),
    abilityName: 'スカイスキン',
  },
  // ギャラドス（gyarados-mega）
  {
    nationalDex: 130,
    speciesName: 'ギャラドス',
    form: 'mega',
    stoneName: 'ギャラドスナイト',
    types: ['みず', 'あく'],
    baseStats: stats(95, 155, 109, 70, 130, 81),
    abilityName: 'かたやぶり',
  },
  // プテラ（aerodactyl-mega）
  {
    nationalDex: 142,
    speciesName: 'プテラ',
    form: 'mega',
    stoneName: 'プテラナイト',
    types: ['いわ', 'ひこう'],
    baseStats: stats(80, 135, 85, 70, 95, 150),
    abilityName: 'かたいツメ',
  },
  // カイリュー（dragonite-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 149,
    speciesName: 'カイリュー',
    form: 'mega',
    stoneName: 'カイリュナイト',
    types: ['ドラゴン', 'ひこう'],
    baseStats: stats(91, 124, 115, 145, 125, 100),
    abilityName: 'マルチスケイル',
  },
  // メガニウム（meganium-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 154,
    speciesName: 'メガニウム',
    form: 'mega',
    stoneName: 'メガニウムナイト',
    types: ['くさ', 'フェアリー'],
    baseStats: stats(80, 92, 115, 143, 115, 80),
    abilityName: 'メガソーラー',
  },
  // オーダイル（feraligatr-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 160,
    speciesName: 'オーダイル',
    form: 'mega',
    stoneName: 'オーダイルナイト',
    types: ['みず', 'ドラゴン'],
    baseStats: stats(85, 160, 125, 89, 93, 78),
    abilityName: 'ドラゴンスキン',
  },
  // デンリュウ（ampharos-mega）
  {
    nationalDex: 181,
    speciesName: 'デンリュウ',
    form: 'mega',
    stoneName: 'デンリュウナイト',
    types: ['でんき', 'ドラゴン'],
    baseStats: stats(90, 95, 105, 165, 110, 45),
    abilityName: 'かたやぶり',
  },
  // ハガネール（steelix-mega）
  {
    nationalDex: 208,
    speciesName: 'ハガネール',
    form: 'mega',
    stoneName: 'ハガネールナイト',
    types: ['はがね', 'じめん'],
    baseStats: stats(75, 125, 230, 55, 95, 30),
    abilityName: 'すなのちから',
  },
  // ハッサム（scizor-mega）
  {
    nationalDex: 212,
    speciesName: 'ハッサム',
    form: 'mega',
    stoneName: 'ハッサムナイト',
    types: ['むし', 'はがね'],
    baseStats: stats(70, 150, 140, 65, 100, 75),
    abilityName: 'テクニシャン',
  },
  // ヘラクロス（heracross-mega）
  {
    nationalDex: 214,
    speciesName: 'ヘラクロス',
    form: 'mega',
    stoneName: 'ヘラクロスナイト',
    types: ['むし', 'かくとう'],
    baseStats: stats(80, 185, 115, 40, 105, 75),
    abilityName: 'スキルリンク',
  },
  // エアームド（skarmory-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 227,
    speciesName: 'エアームド',
    form: 'mega',
    stoneName: 'エアームドナイト',
    types: ['はがね', 'ひこう'],
    baseStats: stats(65, 140, 110, 40, 100, 110),
    abilityName: 'すじがねいり',
  },
  // ヘルガー（houndoom-mega）
  {
    nationalDex: 229,
    speciesName: 'ヘルガー',
    form: 'mega',
    stoneName: 'ヘルガナイト',
    types: ['あく', 'ほのお'],
    baseStats: stats(75, 90, 90, 140, 90, 115),
    abilityName: 'サンパワー',
  },
  // バンギラス（tyranitar-mega）
  {
    nationalDex: 248,
    speciesName: 'バンギラス',
    form: 'mega',
    stoneName: 'バンギラスナイト',
    types: ['いわ', 'あく'],
    baseStats: stats(100, 164, 150, 95, 120, 71),
    abilityName: 'すなおこし',
  },
  // ジュカイン（sceptile-mega）
  {
    nationalDex: 254,
    speciesName: 'ジュカイン',
    form: 'mega',
    stoneName: 'ジュカインナイト',
    types: ['くさ', 'ドラゴン'],
    baseStats: stats(70, 110, 75, 145, 85, 145),
    abilityName: 'ひらいしん',
  },
  // バシャーモ（blaziken-mega）
  {
    nationalDex: 257,
    speciesName: 'バシャーモ',
    form: 'mega',
    stoneName: 'バシャーモナイト',
    types: ['ほのお', 'かくとう'],
    baseStats: stats(80, 160, 80, 130, 80, 100),
    abilityName: 'かそく',
  },
  // ラグラージ（swampert-mega）
  {
    nationalDex: 260,
    speciesName: 'ラグラージ',
    form: 'mega',
    stoneName: 'ラグラージナイト',
    types: ['みず', 'じめん'],
    baseStats: stats(100, 150, 110, 95, 110, 70),
    abilityName: 'すいすい',
  },
  // サーナイト（gardevoir-mega）
  {
    nationalDex: 282,
    speciesName: 'サーナイト',
    form: 'mega',
    stoneName: 'サーナイトナイト',
    types: ['エスパー', 'フェアリー'],
    baseStats: stats(68, 85, 65, 165, 135, 100),
    abilityName: 'フェアリースキン',
  },
  // ヤミラミ（sableye-mega）
  {
    nationalDex: 302,
    speciesName: 'ヤミラミ',
    form: 'mega',
    stoneName: 'ヤミラミナイト',
    types: ['あく', 'ゴースト'],
    baseStats: stats(50, 85, 125, 85, 115, 20),
    abilityName: 'マジックミラー',
  },
  // クチート（mawile-mega）
  {
    nationalDex: 303,
    speciesName: 'クチート',
    form: 'mega',
    stoneName: 'クチートナイト',
    types: ['はがね', 'フェアリー'],
    baseStats: stats(50, 105, 125, 55, 95, 50),
    abilityName: 'ちからもち',
  },
  // ボスゴドラ（aggron-mega）
  {
    nationalDex: 306,
    speciesName: 'ボスゴドラ',
    form: 'mega',
    stoneName: 'ボスゴドラナイト',
    types: ['はがね'],
    baseStats: stats(70, 140, 230, 60, 80, 50),
    abilityName: 'フィルター',
  },
  // チャーレム（medicham-mega）
  {
    nationalDex: 308,
    speciesName: 'チャーレム',
    form: 'mega',
    stoneName: 'チャーレムナイト',
    types: ['かくとう', 'エスパー'],
    baseStats: stats(60, 100, 85, 80, 85, 100),
    abilityName: 'ヨガパワー',
  },
  // ライボルト（manectric-mega）
  {
    nationalDex: 310,
    speciesName: 'ライボルト',
    form: 'mega',
    stoneName: 'ライボルトナイト',
    types: ['でんき'],
    baseStats: stats(70, 75, 80, 135, 80, 135),
    abilityName: 'いかく',
  },
  // サメハダー（sharpedo-mega）
  {
    nationalDex: 319,
    speciesName: 'サメハダー',
    form: 'mega',
    stoneName: 'サメハダナイト',
    types: ['みず', 'あく'],
    baseStats: stats(70, 140, 70, 110, 65, 105),
    abilityName: 'がんじょうあご',
  },
  // バクーダ（camerupt-mega）
  {
    nationalDex: 323,
    speciesName: 'バクーダ',
    form: 'mega',
    stoneName: 'バクーダナイト',
    types: ['ほのお', 'じめん'],
    baseStats: stats(70, 120, 100, 145, 105, 20),
    abilityName: 'ちからずく',
  },
  // チルタリス（altaria-mega）
  {
    nationalDex: 334,
    speciesName: 'チルタリス',
    form: 'mega',
    stoneName: 'チルタリスナイト',
    types: ['ドラゴン', 'フェアリー'],
    baseStats: stats(75, 110, 110, 110, 105, 80),
    abilityName: 'フェアリースキン',
  },
  // ジュペッタ（banette-mega）
  {
    nationalDex: 354,
    speciesName: 'ジュペッタ',
    form: 'mega',
    stoneName: 'ジュペッタナイト',
    types: ['ゴースト'],
    baseStats: stats(64, 165, 75, 93, 83, 75),
    abilityName: 'いたずらごころ',
  },
  // チリーン（chimecho-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 358,
    speciesName: 'チリーン',
    form: 'mega',
    stoneName: 'チリーンナイト',
    types: ['エスパー', 'はがね'],
    baseStats: stats(75, 50, 110, 135, 120, 65),
    abilityName: 'ふゆう',
  },
  // アブソル（absol-mega）
  {
    nationalDex: 359,
    speciesName: 'アブソル',
    form: 'mega',
    stoneName: 'アブソルナイト',
    types: ['あく'],
    baseStats: stats(65, 150, 60, 115, 60, 115),
    abilityName: 'マジックミラー',
  },
  // アブソル（absol-mega-z）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 359,
    speciesName: 'アブソル',
    form: 'mega-z',
    stoneName: 'アブソルナイトZ',
    types: ['あく', 'ゴースト'],
    baseStats: stats(65, 154, 60, 75, 60, 151),
    abilityName: 'きれあじ',
  },
  // オニゴーリ（glalie-mega）
  {
    nationalDex: 362,
    speciesName: 'オニゴーリ',
    form: 'mega',
    stoneName: 'オニゴーリナイト',
    types: ['こおり'],
    baseStats: stats(80, 120, 80, 120, 80, 100),
    abilityName: 'フリーズスキン',
  },
  // ボーマンダ（salamence-mega）
  {
    nationalDex: 373,
    speciesName: 'ボーマンダ',
    form: 'mega',
    stoneName: 'ボーマンダナイト',
    types: ['ドラゴン', 'ひこう'],
    baseStats: stats(95, 145, 130, 120, 90, 120),
    abilityName: 'スカイスキン',
  },
  // メタグロス（metagross-mega）
  {
    nationalDex: 376,
    speciesName: 'メタグロス',
    form: 'mega',
    stoneName: 'メタグロスナイト',
    types: ['はがね', 'エスパー'],
    baseStats: stats(80, 145, 150, 105, 110, 110),
    abilityName: 'かたいツメ',
  },
  // ムクホーク（staraptor-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 398,
    speciesName: 'ムクホーク',
    form: 'mega',
    stoneName: 'ムクホークナイト',
    types: ['かくとう', 'ひこう'],
    baseStats: stats(85, 140, 100, 60, 90, 110),
    abilityName: 'あまのじゃく',
  },
  // ミミロップ（lopunny-mega）
  {
    nationalDex: 428,
    speciesName: 'ミミロップ',
    form: 'mega',
    stoneName: 'ミミロップナイト',
    types: ['ノーマル', 'かくとう'],
    baseStats: stats(65, 136, 94, 54, 96, 135),
    abilityName: 'きもったま',
  },
  // ガブリアス（garchomp-mega）
  {
    nationalDex: 445,
    speciesName: 'ガブリアス',
    form: 'mega',
    stoneName: 'ガブリアスナイト',
    types: ['ドラゴン', 'じめん'],
    baseStats: stats(108, 170, 115, 120, 95, 92),
    abilityName: 'すなのちから',
  },
  // ガブリアス（garchomp-mega-z）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 445,
    speciesName: 'ガブリアス',
    form: 'mega-z',
    stoneName: 'ガブリアスナイトZ',
    types: ['ドラゴン'],
    baseStats: stats(108, 130, 85, 141, 85, 151),
    abilityName: 'ふゆう',
  },
  // ルカリオ（lucario-mega）
  {
    nationalDex: 448,
    speciesName: 'ルカリオ',
    form: 'mega',
    stoneName: 'ルカリオナイト',
    types: ['かくとう', 'はがね'],
    baseStats: stats(70, 145, 88, 140, 70, 112),
    abilityName: 'てきおうりょく',
  },
  // ルカリオ（lucario-mega-z）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 448,
    speciesName: 'ルカリオ',
    form: 'mega-z',
    stoneName: 'ルカリオナイトZ',
    types: ['かくとう', 'はがね'],
    baseStats: stats(70, 100, 70, 164, 70, 151),
    abilityName: 'Aura Guard',
  },
  // ユキノオー（abomasnow-mega）
  {
    nationalDex: 460,
    speciesName: 'ユキノオー',
    form: 'mega',
    stoneName: 'ユキノオナイト',
    types: ['くさ', 'こおり'],
    baseStats: stats(90, 132, 105, 132, 105, 30),
    abilityName: 'ゆきふらし',
  },
  // エルレイド（gallade-mega）
  {
    nationalDex: 475,
    speciesName: 'エルレイド',
    form: 'mega',
    stoneName: 'エルレイドナイト',
    types: ['エスパー', 'かくとう'],
    baseStats: stats(68, 165, 95, 65, 115, 110),
    abilityName: 'せいしんりょく',
  },
  // ユキメノコ（froslass-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 478,
    speciesName: 'ユキメノコ',
    form: 'mega',
    stoneName: 'ユキメノコナイト',
    types: ['こおり', 'ゴースト'],
    baseStats: stats(70, 80, 70, 140, 100, 120),
    abilityName: 'ゆきふらし',
  },
  // エンブオー（emboar-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 500,
    speciesName: 'エンブオー',
    form: 'mega',
    stoneName: 'エンブオナイト',
    types: ['ほのお', 'かくとう'],
    baseStats: stats(110, 148, 75, 110, 110, 75),
    abilityName: 'かたやぶり',
  },
  // ドリュウズ（excadrill-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 530,
    speciesName: 'ドリュウズ',
    form: 'mega',
    stoneName: 'ドリュウズナイト',
    types: ['じめん', 'はがね'],
    baseStats: stats(110, 165, 100, 65, 65, 103),
    abilityName: 'かんつうドリル',
  },
  // タブンネ（audino-mega）
  {
    nationalDex: 531,
    speciesName: 'タブンネ',
    form: 'mega',
    stoneName: 'タブンネナイト',
    types: ['ノーマル', 'フェアリー'],
    baseStats: stats(103, 60, 126, 80, 126, 50),
    abilityName: 'いやしのこころ',
  },
  // ペンドラー（scolipede-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 545,
    speciesName: 'ペンドラー',
    form: 'mega',
    stoneName: 'ペンドラナイト',
    types: ['むし', 'どく'],
    baseStats: stats(60, 140, 149, 75, 99, 62),
    abilityName: 'シェルアーマー',
  },
  // ズルズキン（scrafty-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 560,
    speciesName: 'ズルズキン',
    form: 'mega',
    stoneName: 'ズルズキナイト',
    types: ['あく', 'かくとう'],
    baseStats: stats(65, 130, 135, 55, 135, 68),
    abilityName: 'いかく',
  },
  // シビルドン（eelektross-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 604,
    speciesName: 'シビルドン',
    form: 'mega',
    stoneName: 'シビルドナイト',
    types: ['でんき'],
    baseStats: stats(85, 145, 80, 135, 90, 80),
    abilityName: 'Eelevate',
  },
  // シャンデラ（chandelure-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 609,
    speciesName: 'シャンデラ',
    form: 'mega',
    stoneName: 'シャンデラナイト',
    types: ['ゴースト', 'ほのお'],
    baseStats: stats(60, 75, 110, 175, 110, 90),
    abilityName: 'すりぬけ',
  },
  // ゴルーグ（golurk-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 623,
    speciesName: 'ゴルーグ',
    form: 'mega',
    stoneName: 'ゴルーグナイト',
    types: ['じめん', 'ゴースト'],
    baseStats: stats(89, 159, 105, 70, 105, 55),
    abilityName: 'ふかしのこぶし',
  },
  // ブリガロン（chesnaught-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 652,
    speciesName: 'ブリガロン',
    form: 'mega',
    stoneName: 'ブリガロナイト',
    types: ['くさ', 'かくとう'],
    baseStats: stats(88, 137, 172, 74, 115, 44),
    abilityName: 'ぼうだん',
  },
  // マフォクシー（delphox-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 655,
    speciesName: 'マフォクシー',
    form: 'mega',
    stoneName: 'マフォクシナイト',
    types: ['ほのお', 'エスパー'],
    baseStats: stats(75, 69, 72, 159, 125, 134),
    abilityName: 'ふゆう',
  },
  // ゲッコウガ（greninja-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 658,
    speciesName: 'ゲッコウガ',
    form: 'mega',
    stoneName: 'ゲッコウガナイト',
    types: ['みず', 'あく'],
    baseStats: stats(72, 125, 77, 133, 81, 142),
    abilityName: 'へんげんじざい',
  },
  // カエンジシ（pyroar-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 668,
    speciesName: 'カエンジシ',
    form: 'mega',
    stoneName: 'カエンジシナイト',
    types: ['ほのお', 'ノーマル'],
    baseStats: stats(86, 88, 92, 129, 86, 126),
    abilityName: 'Fire Mane',
  },
  // フラエッテ（floette-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）。えいえんのはなのフラエッテだけがメガシンカする。DB のフラエッテ（ふつうのすがた）とは種族値が違う
  {
    nationalDex: 670,
    speciesName: 'フラエッテ',
    form: 'mega',
    stoneName: 'フラエッテナイト',
    types: ['フェアリー'],
    baseStats: stats(74, 85, 87, 155, 148, 102),
    abilityName: 'フェアリーオーラ',
  },
  // ニャオニクス（meowstic-male-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）。オスとメスで PokeAPI の姿は 2 つあるが、タイプ・種族値・特性は同じなので 1 つにまとめる
  {
    nationalDex: 678,
    speciesName: 'ニャオニクス',
    form: 'mega',
    stoneName: 'ニャオニクスナイト',
    types: ['エスパー'],
    baseStats: stats(74, 48, 76, 143, 101, 124),
    abilityName: 'トレース',
  },
  // カラマネロ（malamar-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 687,
    speciesName: 'カラマネロ',
    form: 'mega',
    stoneName: 'カラマネナイト',
    types: ['あく', 'エスパー'],
    baseStats: stats(86, 102, 88, 98, 120, 88),
    abilityName: 'あまのじゃく',
  },
  // ガメノデス（barbaracle-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 689,
    speciesName: 'ガメノデス',
    form: 'mega',
    stoneName: 'ガメノデスナイト',
    types: ['いわ', 'かくとう'],
    baseStats: stats(72, 140, 130, 64, 106, 88),
    abilityName: 'かたいツメ',
  },
  // ドラミドロ（dragalge-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 691,
    speciesName: 'ドラミドロ',
    form: 'mega',
    stoneName: 'ドラミドナイト',
    types: ['どく', 'ドラゴン'],
    baseStats: stats(65, 85, 105, 132, 163, 44),
    abilityName: 'さいせいりょく',
  },
  // ルチャブル（hawlucha-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 701,
    speciesName: 'ルチャブル',
    form: 'mega',
    stoneName: 'ルチャブルナイト',
    types: ['かくとう', 'ひこう'],
    baseStats: stats(78, 137, 100, 74, 93, 118),
    abilityName: 'ノーガード',
  },
  // ケケンカニ（crabominable-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 740,
    speciesName: 'ケケンカニ',
    form: 'mega',
    stoneName: 'ケケンカニナイト',
    types: ['かくとう', 'こおり'],
    baseStats: stats(97, 157, 122, 62, 107, 33),
    abilityName: 'てつのこぶし',
  },
  // グソクムシャ（golisopod-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 768,
    speciesName: 'グソクムシャ',
    form: 'mega',
    stoneName: 'グソクムシャナイト',
    types: ['むし', 'はがね'],
    baseStats: stats(75, 150, 175, 70, 120, 40),
    abilityName: 'かたいツメ',
  },
  // ジジーロン（drampa-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 780,
    speciesName: 'ジジーロン',
    form: 'mega',
    stoneName: 'ジジーロナイト',
    types: ['ノーマル', 'ドラゴン'],
    baseStats: stats(78, 85, 110, 160, 116, 36),
    abilityName: 'ぎゃくじょう',
  },
  // タイレーツ（falinks-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 870,
    speciesName: 'タイレーツ',
    form: 'mega',
    stoneName: 'タイレーツナイト',
    types: ['かくとう'],
    baseStats: stats(65, 135, 135, 70, 65, 100),
    abilityName: 'まけんき',
  },
  // スコヴィラン（scovillain-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 952,
    speciesName: 'スコヴィラン',
    form: 'mega',
    stoneName: 'スコヴィラナイト',
    types: ['くさ', 'ほのお'],
    baseStats: stats(65, 138, 85, 138, 85, 75),
    abilityName: 'とびだすハバネロ',
  },
  // キラフロル（glimmora-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 970,
    speciesName: 'キラフロル',
    form: 'mega',
    stoneName: 'キラフロルナイト',
    types: ['いわ', 'どく'],
    baseStats: stats(83, 90, 105, 150, 96, 101),
    abilityName: 'てきおうりょく',
  },
  // セグレイブ（baxcalibur-mega）。メガストーンの名前は PokeAPI の ja（ja-Hrkt がない）
  {
    nationalDex: 998,
    speciesName: 'セグレイブ',
    form: 'mega',
    stoneName: 'セグレイブナイト',
    types: ['ドラゴン', 'こおり'],
    baseStats: stats(115, 175, 117, 105, 101, 87),
    abilityName: 'ねつこうかん',
  },
];

/**
 * メガストーンから、メガシンカした姿を引く（メガストーンでない・持ち物なしは undefined）
 */
export const findMegaEvolutionByStone = (
  itemName: string | null | undefined,
): MegaEvolution | undefined =>
  itemName == null ? undefined : MEGA_EVOLUTIONS.find(entry => entry.stoneName === itemName);

/**
 * ポケモンが持ち物でメガシンカできるなら、メガシンカした姿を返す
 * メガストーンでない持ち物・持ち物なし・別の種族のメガストーンは undefined
 * @param nationalDex ポケモンの全国図鑑の番号（Pokemon.nationalDex）
 * @param itemName 持ち物の名前（TrainedPokemon.heldItem）
 */
export const findMegaEvolution = (
  nationalDex: number,
  itemName: string | null | undefined,
): MegaEvolution | undefined => {
  const mega = findMegaEvolutionByStone(itemName);
  return mega?.nationalDex === nationalDex ? mega : undefined;
};

/**
 * メガストーンか
 */
export const isMegaStone = (itemName: string | null | undefined): boolean =>
  findMegaEvolutionByStone(itemName) !== undefined;
