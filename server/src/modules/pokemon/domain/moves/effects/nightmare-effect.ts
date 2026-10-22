import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { isEffectivelyAsleep } from '../../battle-events/effective-status';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * あくむ（Nightmare）技の効果
 * ねむっている相手をあくむ状態にする（nightmare）
 *
 * - 相手がねむり（ぜったいねむりを含む）でなければ失敗する
 * - すでにあくむ状態の相手には失敗する（tryApplyVolatile が判定する）
 * - ターン終了時にねむっている間だけ最大 HP の 1/4 を減らし、目を覚ましたら消すのはエンジンが行う
 */
export class NightmareEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!isEffectivelyAsleep(defender, battleContext)) {
      return 'But it failed';
    }
    const applied = await tryApplyVolatile(
      defender,
      'nightmare',
      { nightmare: true },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'began having a nightmare!' : 'But it failed';
  }
}
