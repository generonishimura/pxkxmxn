import { IMoveEffect } from '../move-effect.interface';

/**
 * トーチカ（Baneful Bunker）技の効果
 *
 * 効果: そのターン、相手の技（変化技も）を防ぐ。防いだ技が接触技なら、使用者をどくにする
 *       まもると同じく、続けて使うと成功率が 1/3 倍ずつになる（1、1/3、1/9、…）
 *       成功の判定・守りの書き込み・接触した相手へのどくはエンジンが行う
 */
export class BanefulBunkerEffect implements IMoveEffect {
  readonly protection = { kind: 'banefulBunker' } as const;
}
