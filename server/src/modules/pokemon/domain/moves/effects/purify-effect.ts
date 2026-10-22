import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatusCondition } from './base/base-heal-effect';

/**
 * じょうか（Purify）技の効果
 *
 * 効果: 相手の状態異常（やけど・こおり・まひ・どく・もうどく・ねむり）を治し、
 *       自分の HP を最大 HP の 1/2（端数切り上げ）回復する
 *
 * - 相手が状態異常でない場合は失敗
 * - 自分の HP が満タンでも、相手の状態異常は治す
 */
export class PurifyEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    if (!isMajorStatusCondition(defender.statusCondition)) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      statusCondition: StatusCondition.None,
    });
    const messages = ["The target's status condition was cured!"];

    if (attacker.currentHp > 0 && attacker.currentHp < attacker.maxHp) {
      const healAmount = Math.max(1, Math.ceil(attacker.maxHp / 2));
      await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
        currentHp: Math.min(attacker.maxHp, attacker.currentHp + healAmount),
      });
      messages.push('HP was restored!');
    }

    return messages.join(' ');
  }
}
