import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { getEffectiveStatusCondition } from '../../battle-events/effective-status';

/**
 * 「めざましビンタ」の特殊効果実装
 *
 * 効果: 相手がねむりのとき、威力が 2 倍になる（70 → 140）。命中させると相手のねむりを解除する
 * - 相手の特性がぜったいねむりなら、状態異常がなくても威力が 2 倍になる（起こしはしない。本家と同じ）
 */
export class WakeUpSlapEffect implements IMoveEffect {
  modifyMovePower(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const basePower = battleContext.movePower;
    const asleep = getEffectiveStatusCondition(defender, battleContext) === StatusCondition.Sleep;
    if (basePower === null || basePower === undefined || !asleep) {
      return undefined;
    }
    return basePower * 2;
  }

  async onHit(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (defender.statusCondition !== StatusCondition.Sleep) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.None,
    });

    return 'target woke up!';
  }
}
