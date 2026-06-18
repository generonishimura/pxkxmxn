import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「リフレッシュ」の特殊効果実装
 *
 * 効果: 自分のやけど・まひ・どく（もうどく含む）を回復する
 */
export class RefreshEffect implements IMoveEffect {
  private static readonly CURABLE_CONDITIONS: ReadonlySet<StatusCondition> = new Set([
    StatusCondition.Burn,
    StatusCondition.Paralysis,
    StatusCondition.Poison,
    StatusCondition.BadPoison,
  ]);

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (
      !attacker.statusCondition ||
      !RefreshEffect.CURABLE_CONDITIONS.has(attacker.statusCondition)
    ) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      statusCondition: StatusCondition.None,
    });

    return 'The user was cured of its status condition!';
  }
}
