import { BaseTypeBoostItemEffect } from './base-type-boost-item-effect';

/**
 * 決まったタイプの技の威力を 1.2 倍にする持ち物（くろおび・しんぴのしずく など）
 * タイプは作るときに渡す。もくたんは CharcoalEffect
 */
export class TypeBoostItemEffect extends BaseTypeBoostItemEffect {
  constructor(protected readonly boostedType: string) {
    super();
  }
}

/**
 * タイプの技を強くする持ち物の名前（PokeAPI の ja-Hrkt 名）と、威力を上げる技のタイプ
 * もくたんは CharcoalEffect で登録している
 */
export const TYPE_BOOST_ITEMS: ReadonlyArray<readonly [string, string]> = [
  ['くろおび', 'かくとう'],
  ['くろいメガネ', 'あく'],
  ['りゅうのキバ', 'ドラゴン'],
  ['ようせいのハネ', 'フェアリー'],
  ['かたいいし', 'いわ'],
  ['じしゃく', 'でんき'],
  ['メタルコート', 'はがね'],
  ['きせきのタネ', 'くさ'],
  ['しんぴのしずく', 'みず'],
  ['とけないこおり', 'こおり'],
  ['どくバリ', 'どく'],
  ['するどいくちばし', 'ひこう'],
  ['シルクのスカーフ', 'ノーマル'],
  ['ぎんのこな', 'むし'],
  ['やわらかいすな', 'じめん'],
  ['のろいのおふだ', 'ゴースト'],
  ['まがったスプーン', 'エスパー'],
];
