import { IMoveEffect } from '../move-effect.interface';

/**
 * ニードルガード（Spiky Shield）技の効果
 * そのターンだけ、相手の技（変化技も）から身を守る。
 * 守っている間に接触技を使った相手は、最大 HP の 1/8（切り捨て・最低 1）のダメージを受ける。
 * 続けて使うと成功率が 1/3 ずつ下がる
 *
 * 成功の判定・守りの書き込み・相手の技を防ぐ処理・接触した相手へのダメージはエンジンが行う
 */
export class SpikyShieldEffect implements IMoveEffect {
  readonly protection = { kind: 'spikyShield' } as const;
}
