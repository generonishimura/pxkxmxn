import { IMoveEffect, LockedInMoveConfig } from '../move-effect.interface';

/**
 * さわぐ（Uproar）技の効果
 * 使ったターンを含めて 3 ターン、選んだ行動にかかわらず出し続ける（2 ターン目からは PP が減らない）。
 * 出している間（最後のターンはターン終了時まで）、場の誰もねむりにならない。当たるたびに場のねむっているポケモンを起こす。
 * 出し続ける・眠らせない・起こすのはエンジンが行う（lockedIn の preventsSleep で volatileState.uproar を書く）
 *
 * 注: 本家は技を当てる前（onTryHit）に起こすので、外れても起こす。ここでは当たったときだけ起こす
 * 注: 本家は効かなかったとき（ゴーストタイプなど）も出し続けるが、ここでは失敗・効かなかったら止まる（エンジンの lockedIn の決まり）
 */
export class UproarEffect implements IMoveEffect {
  readonly lockedIn: LockedInMoveConfig = { turns: 3, preventsSleep: true };
}
