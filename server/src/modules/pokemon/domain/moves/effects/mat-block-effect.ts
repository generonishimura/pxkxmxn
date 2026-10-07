import { IMoveEffect } from '../move-effect.interface';

/**
 * たたみがえし（Mat Block）技の効果
 * 場に出てから最初の行動でだけ成功し、そのターンだけ自分の陣営を相手の攻撃技から守る（変化技は防がない）。
 * まもる系を続けた回数は消す
 *
 * 成功の判定（出てから最初の行動か・このターン最後に動くなら失敗）・陣営への書き込み・相手の技を防ぐ処理はエンジンが行う
 */
export class MatBlockEffect implements IMoveEffect {
  readonly protection = { side: 'matBlock' } as const;
}
