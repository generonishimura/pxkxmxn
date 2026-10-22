import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ベノムショック（Venoshock）技の効果
 *
 * 効果: 相手がどく・もうどくのとき、威力が2倍になる（65 → 130）
 * 本家と同じく、相手の特性がぜったいねむりでも、どくでなければ2倍にならない
 */
export class VenoshockEffect implements IMoveEffect {
  modifyMovePower(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const basePower = battleContext.movePower;
    const status = defender.statusCondition;
    const poisoned = status === StatusCondition.Poison || status === StatusCondition.BadPoison;
    if (basePower === null || basePower === undefined || !poisoned) {
      return undefined;
    }
    return basePower * 2;
  }
}
