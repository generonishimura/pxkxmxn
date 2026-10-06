import { BaseOpponentMultiStatChangeMoveEffect } from './base/base-opponent-multi-stat-change-move-effect';
import { StatType } from './base/base-stat-change-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * ベノムトラップ（Venom Drench）技の効果
 *
 * 効果: どく・もうどく状態の相手の攻撃・特攻・素早さを 1 段階ずつ下げる
 *
 * - 相手がどく・もうどく状態でなければ失敗する
 *
 * 注: 基底クラスは相手の特性の canReceiveStatChange を参照しないため、
 *     クリアボディ等による能力低下の無効化は再現しない
 */
export class VenomDrenchEffect extends BaseOpponentMultiStatChangeMoveEffect {
  protected readonly statChanges: ReadonlyArray<{ statType: StatType; rankChange: number }> = [
    { statType: 'attack', rankChange: -1 },
    { statType: 'specialAttack', rankChange: -1 },
    { statType: 'speed', rankChange: -1 },
  ];

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const isPoisoned =
      defender.statusCondition === StatusCondition.Poison ||
      defender.statusCondition === StatusCondition.BadPoison;
    if (!isPoisoned) {
      return null;
    }
    return super.onUse(attacker, defender, battleContext);
  }
}
