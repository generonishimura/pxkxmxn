import { IMoveEffect } from '../move-effect.interface';

/**
 * みきり（Detect）技の効果
 *
 * 効果: そのターン、相手の技（変化技も）を防ぐ。まもると同じ守りで、続けて使うと成功率が 1/3 ずつ下がる
 *       成功の判定・守りの書き込み・protectCount の更新はエンジンが行う
 * 注: 防いだときのメッセージの守りの技名は、まもると同じ守りなので「まもる」になる
 */
export class DetectEffect implements IMoveEffect {
  readonly protection = { kind: 'protect' } as const;
}
