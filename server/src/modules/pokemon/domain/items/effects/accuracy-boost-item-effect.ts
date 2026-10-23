import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 4096 分率の補正の分母
 */
const FIXED_POINT_BASE = 4096;

/**
 * こうかくレンズ（Wide Lens）
 * 持ち主が使う技の命中率を 1.1 倍にする（本家の onSourceModifyAccuracy の chainModify([4505, 4096])）
 * 命中率が null の技（必ず当たる技）は、AccuracyCalculator がこの前に当たりにする
 */
export class WideLensEffect implements IItemEffect {
  private static readonly ACCURACY_MODIFIER = 4505;

  modifyAccuracy(_holder: BattlePokemonStatus, accuracy: number): number {
    return (accuracy * WideLensEffect.ACCURACY_MODIFIER) / FIXED_POINT_BASE;
  }
}

/**
 * フォーカスレンズ（Zoom Lens）
 * 相手のあとに行動するとき（相手がこのターンにもう技を出さないとき）、技の命中率を 1.2 倍にする
 * （本家の onSourceModifyAccuracy の chainModify([4915, 4096])。条件は !queue.willMove(target)）
 *
 * 相手のあとに行動するかは battleContext.isLastToMove（アナライズと同じ）で判定する
 */
export class ZoomLensEffect implements IItemEffect {
  private static readonly ACCURACY_MODIFIER = 4915;

  modifyAccuracy(
    _holder: BattlePokemonStatus,
    accuracy: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.isLastToMove !== true) {
      return undefined;
    }
    return (accuracy * ZoomLensEffect.ACCURACY_MODIFIER) / FIXED_POINT_BASE;
  }
}

/**
 * ひかりのこな（Bright Powder）
 * 持ち主が受ける技の命中率を 0.9 倍にする（本家の onModifyAccuracy の chainModify([3686, 4096])）
 * modifyEvasion は「命中率から減らす割合」を返すので、1 - 3686/4096 を返す
 */
export class BrightPowderEffect implements IItemEffect {
  private static readonly ACCURACY_MODIFIER = 3686;

  modifyEvasion(): number {
    return 1 - BrightPowderEffect.ACCURACY_MODIFIER / FIXED_POINT_BASE;
  }
}
