import { IMoveEffect } from '../move-effect.interface';

/**
 * キングシールド（King's Shield）技の効果
 *
 * 効果: そのターンの相手の攻撃技を防ぐ（変化技は防がない）。防いだ技が接触技なら、使用者の攻撃を 1 段階下げる（第 8 世代から）。
 *       続けて使うと成功率が 1/3 倍ずつになる（1、1/3、1/9、…。まもると同じ）。
 *       成功判定・守りの書き込み・相手の技を防ぐ処理・接触したときの効果は、技の protection を見てエンジンが行う
 *
 * ギルガルドがキングシールドを使ったときにシールドフォルムに戻る効果は、この技ではなく
 * 特性のバトルスイッチ（StanceChangeEffect の onPrepareHit）が行う
 */
export class KingsShieldEffect implements IMoveEffect {
  readonly protection = { kind: 'kingsShield' } as const;
}
