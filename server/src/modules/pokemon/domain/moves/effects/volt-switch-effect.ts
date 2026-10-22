import { IMoveEffect } from '../move-effect.interface';

/**
 * ボルトチェンジ（Volt Switch）技の効果
 *
 * ダメージを与えたあと、使用者が控えのポケモンと交代する（交代はエンジン。selfSwitch）。
 * じめんタイプ・ちくでんなどで効かなかったときは、当たっていないので交代しない。
 * ほかの条件はとんぼがえりと同じ
 */
export class VoltSwitchEffect implements IMoveEffect {
  readonly selfSwitch = true;
}
