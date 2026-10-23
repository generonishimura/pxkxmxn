import { IItemEffect } from '../item-effect.interface';

/**
 * だっしゅつボタン（Eject Button）
 * 相手の攻撃技を受けたあと、持ち主が控えと交代し、ボタンを使い切る（判定と交代はエンジンが行う）
 *
 * - 持ち主がひんし・控えがいない・ドラゴンテールなどで交代させられるときは使わない（本家と同じ）
 * - 使ったら、相手のとんぼがえりなどの交代は起きない。持ち主のききかいひも発動しない
 * - みがわりに当たったときは使わない
 * - ちからずくで追加効果が消えた技を受けたときは使わない（本家と同じ）
 * 注: 交代先をプレイヤーが選ぶ API はまだないので、控えの先頭と交代する
 */
export class EjectButtonEffect implements IItemEffect {
  readonly switchesOutAfterHit = true;
}
