import { BaseChargeOnHitEffect } from '../base/base-charge-on-hit-effect';
import { HitResult } from '../../../battle-events/hit-result';
import { BattleContext } from '../../battle-context.interface';

/**
 * ふうりょくでんき（Wind Power）特性の効果
 * 風技（技フラグの wind）でダメージを受けるたびに、じゅうでん状態になる
 * （次のでんき技の威力が 2 倍。エンジンが行う）
 *
 * 注: 自分の陣営においかぜが吹いたときにじゅうでん状態になる効果は、まだない。
 *     陣営の状態が始まったときに呼ばれる特性のフックがないため
 */
export class WindPowerEffect extends BaseChargeOnHitEffect {
  protected readonly abilityName = 'ふうりょくでんき';

  protected chargesOn(_hit: HitResult, battleContext: BattleContext): boolean {
    return battleContext.moveFlags?.has('wind') === true;
  }
}
