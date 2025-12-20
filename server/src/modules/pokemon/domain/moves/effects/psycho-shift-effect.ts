import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「サイコシフト」の特殊効果実装
 *
 * 効果: 自分の状態異常を相手に移す
 */
export class PsychoShiftEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 自分に状態異常がない場合は何もしない
    if (!attacker.statusCondition || attacker.statusCondition === StatusCondition.None) {
      return null;
    }

    // 相手が既に状態異常を持っている場合は何もしない
    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    // 自分の状態異常を相手に移す
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: attacker.statusCondition,
    });

    // 自分の状態異常を解除
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      statusCondition: StatusCondition.None,
    });

    return 'The user transferred its status condition to the target!';
  }
}

