import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「きつけ」の特殊効果実装
 *
 * 効果: 相手がまひのとき、威力が 2 倍になる（70 → 140）。命中させると相手のまひを解除する
 */
export class SmellingSaltsEffect implements IMoveEffect {
  modifyMovePower(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const basePower = battleContext.movePower;
    if (
      basePower === null ||
      basePower === undefined ||
      defender.statusCondition !== StatusCondition.Paralysis
    ) {
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

    if (defender.statusCondition !== StatusCondition.Paralysis) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.None,
    });

    return "target's paralysis was cured!";
  }
}
