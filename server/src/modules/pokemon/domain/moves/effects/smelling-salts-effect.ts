import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「きつけ」の特殊効果実装
 *
 * 効果: 相手がまひ状態のときに命中させるとまひを解除する
 * 注: 「相手がまひ状態のときに威力2倍」の効果は、技の威力を動的に修正する
 *     power-modifier API が未整備のため別処理（ダメージ計算側）で扱う
 */
export class SmellingSaltsEffect implements IMoveEffect {
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
