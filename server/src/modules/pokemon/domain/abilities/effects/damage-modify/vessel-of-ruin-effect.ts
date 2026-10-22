import { BaseRuinEffect } from '../base/base-ruin-effect';

/**
 * わざわいのうつわ（Vessel of Ruin）特性の効果
 * 自分以外のポケモンのとくこうを 0.75 倍にする
 *
 * 注: 相手のとくこう低下は、受ける特殊技のダメージを 0.75 倍にすることで表現する。
 *     かたやぶりの攻撃では防御側の特性として無視されるが、本家ではかたやぶりで無視されない。
 *     同じ特性を持つ相手にも効果が及ぶ（本家では及ばない）
 */
export class VesselOfRuinEffect extends BaseRuinEffect {
  protected readonly loweredStat = 'offense' as const;
  protected readonly moveCategory = 'Special' as const;
}
