import { IMoveEffect } from '../move-effect.interface';

/**
 * ともえなげ（Circle Throw）技の効果
 *
 * ダメージを与えたあと、相手を控えのポケモンとランダムに入れ替える（優先度 -6 は DB の値。入れ替えはエンジン。forceSwitch）。
 * 入れ替えない条件はドラゴンテールと同じ
 */
export class CircleThrowEffect implements IMoveEffect {
  readonly forceSwitch = true;
}
