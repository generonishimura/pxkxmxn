import { IMoveEffect } from '../move-effect.interface';

/**
 * ドラゴンテール（Dragon Tail）技の効果
 *
 * ダメージを与えたあと、相手を控えのポケモンとランダムに入れ替える（優先度 -6 は DB の値。入れ替えはエンジン。forceSwitch）。
 * みがわりに当たった・相手がひんしになった・控えがいない・ねをはっている・きゅうばん（かたやぶりで無視される）・
 * 使用者がひんしになった（さめはだなど）ときは入れ替えない。ダメージは与える（技は失敗しない）
 */
export class DragonTailEffect implements IMoveEffect {
  readonly forceSwitch = true;
}
