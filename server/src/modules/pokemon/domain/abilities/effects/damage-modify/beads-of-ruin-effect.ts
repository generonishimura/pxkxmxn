import { BaseRuinEffect } from '../base/base-ruin-effect';

/**
 * わざわいのたま（Beads of Ruin）特性の効果
 * 自分以外のポケモンのとくぼうを 0.75 倍にする
 *
 * 注: 相手のとくぼう低下は、自分の特殊技のダメージを 1/0.75 倍にすることで表現する。
 *     同じ特性を持つ相手にも効果が及ぶ（本家では及ばない）
 */
export class BeadsOfRuinEffect extends BaseRuinEffect {
  protected readonly loweredStat = 'defense' as const;
  protected readonly moveCategory = 'Special' as const;
}
