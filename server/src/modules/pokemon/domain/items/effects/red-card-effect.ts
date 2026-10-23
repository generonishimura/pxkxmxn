import { IItemEffect } from '../item-effect.interface';

/**
 * レッドカード（Red Card）
 * 相手の攻撃技を受けたあと、攻撃側を控えとランダムに入れ替え、カードを使い切る（判定と交代はエンジンが行う）
 *
 * - 持ち主・攻撃側がひんし、攻撃側に控えがいない、持ち主がドラゴンテールなどで交代させられるときは使わない
 * - 攻撃側がねをはっている・きゅうばんなどのときは、入れ替えないがカードは使い切る（本家と同じ）
 * - 入れ替えたら、攻撃側のとんぼがえりなどの交代は起きない
 * - みがわりに当たったときは使わない
 * 注: 本家は、ちからずくの使い手の追加効果のある技では使わないが、ここでは使う
 */
export class RedCardEffect implements IItemEffect {
  readonly forcesAttackerOutAfterHit = true;
}
