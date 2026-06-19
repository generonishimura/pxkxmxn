import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ねむる」の特殊効果実装
 *
 * 効果: 自分の HP を全回復し、自分自身を眠り状態にする（本家では2ターン）
 *
 * 注: 本家では「2ターン固定で眠る」が、現状の engine では状態異常のターン経過管理が
 *     未整備のため、眠り状態の付与のみを行う（眠りの起床処理は engine 側の責務）
 */
export class RestEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 既に HP 満タンかつ眠り状態なら失敗
    if (
      attacker.currentHp === attacker.maxHp &&
      attacker.statusCondition === StatusCondition.Sleep
    ) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.maxHp,
      statusCondition: StatusCondition.Sleep,
    });

    return 'user slept and recovered HP!';
  }
}
