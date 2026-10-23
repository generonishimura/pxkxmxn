import { BaseStatChangeEffect } from './base/base-stat-change-effect';

/**
 * ムーンフォース（Moonblast）技の効果
 *
 * 効果: 10%の確率で相手の特攻ランクを1段階下げる
 * チャンピオンズの確率。SV は 30%
 */
export class MoonblastEffect extends BaseStatChangeEffect {
  protected readonly statType = 'specialAttack' as const;
  protected readonly rankChange = -1;
  protected readonly chance = 0.1;
}
