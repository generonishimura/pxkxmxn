import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「はらだいこ」の特殊効果実装
 *
 * 効果: 自分の最大 HP の 1/2 を払い、攻撃ランクを最大（+6）にする
 *
 * - 現在 HP が最大 HP の 1/2 以下の場合は失敗
 * - 既に攻撃ランクが +6 の場合は失敗（HP も減らない、本家挙動）
 */
export class BellyDrumEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const hpCost = Math.floor(attacker.maxHp / 2);
    if (attacker.currentHp <= hpCost) {
      return null;
    }
    if (attacker.attackRank >= 6) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - hpCost,
      attackRank: 6,
    });

    return 'user cut its HP and maxed its Attack!';
  }
}
