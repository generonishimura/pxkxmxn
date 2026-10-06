import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { IMoveEffect } from '../move-effect.interface';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * おんねん（Grudge）技の効果
 *
 * 使用者に grudge を書く。使用者が次に技を出そうとするまでに相手の技で倒されると、
 * その技の PP が 0 になる（発動・消去はエンジンの MoveLifecycle.applyFaintReactions・BeforeMoveChecker）
 * - みらいよち・はめつのねがいで倒されたときは発動しない（エンジン）
 * 注: ゆびをふる・ねごとなどで呼ばれた技で倒されたときは、PP が 0 にならない。本家では呼んだ技（ゆびをふるなど）の PP が 0 になる
 *   （エンジンが倒した技そのものの PP を 0 にするため。呼ばれた技は相手の技の欄にない）
 * 注: おんねんは第 8 世代から使えない技のため、使えた第 7 世代までの動き（本家の Gen 7）に合わせる
 */
export class GrudgeEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(attacker, 'grudge', { grudge: true }, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return applied ? 'wants its target to bear a grudge!' : 'But it failed';
  }
}
