import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「めざましビンタ」の特殊効果実装
 *
 * 効果: 相手が眠り状態のときに命中させると相手の眠り状態を解除する
 * 注: 相手が眠り状態のときに威力が2倍になる効果は、技の威力を動的に修正する
 *     仕組みが未整備なため別処理（ダメージ計算側）で扱う
 */
export class WakeUpSlapEffect implements IMoveEffect {
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
