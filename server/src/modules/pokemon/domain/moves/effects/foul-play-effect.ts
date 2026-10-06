import { AttackStatOverride, IMoveEffect } from '../move-effect.interface';

/**
 * イカサマ（Foul Play）技の効果
 *
 * 自分の攻撃ではなく、相手の攻撃の実数値と攻撃ランクでダメージを計算する。
 * やけどの半減は、技を使った自分がやけどのときに掛かる。
 *
 * 注: 相手がてんねんのとき、エンジンは相手の攻撃ランクを無視する。
 * 本家では、てんねんは自分のランクを無視しないため、相手の攻撃ランクをそのまま使う。
 */
export class FoulPlayEffect implements IMoveEffect {
  readonly attackStatOverride: AttackStatOverride = { source: 'defender', stat: 'attack' };
}
