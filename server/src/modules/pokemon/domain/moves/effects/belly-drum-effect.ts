import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「はらだいこ」の特殊効果実装
 *
 * 効果: 自分の最大 HP の 1/2 を払い、攻撃ランクを最大（+6）にする
 *
 * - 現在 HP が最大 HP の 1/2 以下の場合は失敗（最大 HP が 1 なら、支払う HP を最低 1 にするので失敗）
 * - 既に攻撃ランクが +6 の場合は失敗（HP も減らない、本家挙動）
 * - 失敗したときは 'But it failed' を返す（null はエンジンで成功として扱われるため）
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

    const hpCost = Math.max(1, Math.floor(attacker.maxHp / 2));
    if (attacker.currentHp <= hpCost || attacker.attackRank >= 6) {
      return 'But it failed';
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - hpCost,
      attackRank: 6,
    });

    return 'user cut its HP and maxed its Attack!';
  }
}
