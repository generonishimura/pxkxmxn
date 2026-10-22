import { IMoveEffect } from '../move-effect.interface';

/**
 * とんぼがえり（U-turn）技の効果
 *
 * ダメージを与えたあと、使用者が控えのポケモンと交代する（交代はエンジン。selfSwitch）。
 * 当たったとき（みがわりに当たったとき・相手をひんしにしたときを含む）だけ交代する。
 * 外れた・効かなかった・控えがいない・使用者がひんしになった・相手のききかいひが発動したときは交代しない
 */
export class UTurnEffect implements IMoveEffect {
  readonly selfSwitch = true;
}
