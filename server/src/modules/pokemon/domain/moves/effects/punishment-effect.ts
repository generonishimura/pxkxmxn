import { BasePositiveRankPowerEffect } from './base/base-positive-rank-power-effect';

/**
 * おしおき（Punishment）技の効果
 *
 * 威力 = 60 + 20 × （相手の上がっているランクの合計）。上限は200。
 * 命中・回避のランクも数え、下がっているランクは数えない。DB の威力は null なので、威力はここで決める
 */
export class PunishmentEffect extends BasePositiveRankPowerEffect {
  protected readonly rankOwner = 'defender';
  protected readonly basePower = 60;
  protected readonly powerPerRank = 20;
  protected readonly maxPower = 200;
}
