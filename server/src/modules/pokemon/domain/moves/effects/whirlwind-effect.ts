import { IMoveEffect } from '../move-effect.interface';

/**
 * ふきとばし（Whirlwind）技の効果
 *
 * 相手を控えのポケモンとランダムに入れ替える（優先度 -6 は DB の値）。
 * 相手がひんし・控えがいない・ねをはっている・きゅうばん（かたやぶりで無視される）なら失敗する。
 * 失敗の判定と入れ替えはエンジンが行う（forceSwitch）
 */
export class WhirlwindEffect implements IMoveEffect {
  readonly forceSwitch = true;
}
