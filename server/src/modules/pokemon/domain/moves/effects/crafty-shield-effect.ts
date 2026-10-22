import { IMoveEffect } from '../move-effect.interface';

/**
 * トリックガード（Crafty Shield）技の効果
 * そのターンだけ、自分の陣営を相手の変化技から守る（攻撃技は防がない）。
 * まもるで防げない変化技も防ぐ。続けて使っても失敗しやすくならず、まもる系を続けた回数も消す
 *
 * 成功の判定（このターン最後に動くなら失敗）・陣営への書き込み・相手の技を防ぐ処理はエンジンが行う
 */
export class CraftyShieldEffect implements IMoveEffect {
  readonly protection = { side: 'craftyShield' } as const;
}
