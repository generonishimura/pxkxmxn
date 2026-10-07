import { IMoveEffect } from '../move-effect.interface';

/**
 * こらえる（Endure）技の効果
 *
 * 効果: そのターン、技のダメージで HP が 0 になるとき、HP が 1 残る（連続技はヒットごと）
 *       相手の技は防がない。まもると同じく、続けて使うと成功率が 1/3 倍ずつになる（1、1/3、1/9、…）
 *       成功の判定・HP を 1 残す処理はエンジンが行う
 * 注: 技以外のダメージ（どく・すなあらしなど）とこんらんの自傷では HP は残らない（本家と同じ）
 */
export class EndureEffect implements IMoveEffect {
  readonly protection = { kind: 'endure' } as const;
}
