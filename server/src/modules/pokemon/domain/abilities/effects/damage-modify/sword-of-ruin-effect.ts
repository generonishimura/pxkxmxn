import { BaseRuinEffect } from '../base/base-ruin-effect';

/**
 * わざわいのつるぎ（Sword of Ruin）特性の効果
 * 自分以外のポケモンのぼうぎょを 0.75 倍にする
 *
 * 注: 相手のぼうぎょ低下は、自分の物理技のダメージを 1/0.75 倍にすることで表現する。
 *     同じ特性を持つ相手にも効果が及ぶ（本家では及ばない）
 */
export class SwordOfRuinEffect extends BaseRuinEffect {
  protected readonly loweredStat = 'defense' as const;
  protected readonly moveCategory = 'Physical' as const;
}
