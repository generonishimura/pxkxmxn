import { BaseOpponentStatChangeEffect } from '../base/base-opponent-stat-change-effect';

/**
 * かんろなミツ（Supersweet Syrup）特性の効果
 * 場に出たとき、相手の回避ランクを 1 段階下げる
 *
 * 注: 本来は 1 回のバトルで 1 度しか発動しないが、バトル単位の発動済みフラグが無いため、
 *     場に出るたびに発動する
 */
export class SupersweetSyrupEffect extends BaseOpponentStatChangeEffect {
  protected readonly statType = 'evasion' as const;
  protected readonly rankChange = -1;
}
