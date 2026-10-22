import { IMoveEffect } from '../move-effect.interface';

/**
 * まもる（Protect）技の効果
 *
 * 効果: そのターンの相手の技（攻撃技・変化技）を防ぐ。続けて使うと成功率が 1/3 倍ずつになる（1、1/3、1/9、…、最低 1/729）。
 *       このターン最後に動くときは失敗する。
 *       成功判定・守りの書き込み・相手の技を防ぐ処理は、技の protection を見てエンジンが行う
 */
export class ProtectEffect implements IMoveEffect {
  readonly protection = { kind: 'protect' } as const;
}
