import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「いたみわけ」の特殊効果実装
 *
 * 効果: 自分と相手の現在 HP を平均値にする
 *       両者の HP を上限（それぞれの maxHp）でクランプ
 */
export class PainSplitEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const averagedHp = Math.floor((attacker.currentHp + defender.currentHp) / 2);
    const newAttackerHp = Math.min(averagedHp, attacker.maxHp);
    const newDefenderHp = Math.min(averagedHp, defender.maxHp);

    // 両者とも変化が無ければ何もしない
    if (newAttackerHp === attacker.currentHp && newDefenderHp === defender.currentHp) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: newAttackerHp,
    });
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      currentHp: newDefenderHp,
    });

    return 'HP was averaged with the target!';
  }
}
