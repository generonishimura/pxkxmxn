import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * どくのいと（Toxic Thread）技の効果
 *
 * 効果: 相手にどくを付与し、すばやさランクを1段階下げる
 *       (Poisons the target and lowers its Speed by one stage)
 *
 * - どくの付与は canInflictStatus / inflictStatus で行う（どく・はがねタイプの免疫・相手の特性・かたやぶり・ふしょく・シンクロなどが効く）
 * - すばやさランクは状態異常付与の成否にかかわらず常に下げを試みる
 */
export class ToxicThreadEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const messages: string[] = [];

    // どく付与の試行（付与されたあとの特性（シンクロなど）のメッセージも足す）
    const options = { source: moveEffectSource(attacker, battleContext) };
    if (await canInflictStatus(defender, StatusCondition.Poison, battleContext, options)) {
      const inflictedMessages = await inflictStatus(
        defender,
        StatusCondition.Poison,
        battleContext,
        options,
      );
      messages.push('was poisoned!', ...inflictedMessages);
    }

    // すばやさランク -1 の試行
    const currentSpeedRank = defender.getStatRank('speed');
    const newSpeedRank = Math.max(-6, currentSpeedRank - 1);
    if (newSpeedRank !== currentSpeedRank) {
      await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
        speedRank: newSpeedRank,
      });
      messages.push('Speed fell!');
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }
}
