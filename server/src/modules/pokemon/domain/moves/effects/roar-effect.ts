import { IMoveEffect } from '../move-effect.interface';

/**
 * ほえる（Roar）技の効果
 *
 * 相手を控えのポケモンとランダムに入れ替える（優先度 -6 は DB の値。音の技なのでみがわりを貫通する）。
 * 相手がひんし・控えがいない・ねをはっている・きゅうばん（かたやぶりで無視される）なら失敗する。
 * 失敗の判定と入れ替えはエンジンが行う（forceSwitch）
 */
export class RoarEffect implements IMoveEffect {
  readonly forceSwitch = true;
}
