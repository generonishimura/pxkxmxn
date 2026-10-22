import { IMoveEffect } from '../move-effect.interface';

/**
 * クイックターン（Flip Turn）技の効果
 *
 * ダメージを与えたあと、使用者が控えのポケモンと交代する（交代はエンジン。selfSwitch）。
 * ちょすい・よびみずなどで効かなかったときは、当たっていないので交代しない。
 * ほかの条件はとんぼがえりと同じ
 */
export class FlipTurnEffect implements IMoveEffect {
  readonly selfSwitch = true;
}
