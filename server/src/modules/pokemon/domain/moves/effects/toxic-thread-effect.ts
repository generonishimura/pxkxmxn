import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';
import { applyStatChanges } from '../../battle-events/stat-change';
import { joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

/**
 * どくのいとで下げるすばやさのランク
 * チャンピオンズの値。SV は -1
 */
const TOXIC_THREAD_SPEED_DROP = -2;

/**
 * どくのいと（Toxic Thread）技の効果
 *
 * 効果: 相手にどくを付与し、すばやさランクを2段階下げる
 *       (Poisons the target and lowers its Speed by two stages)
 *       2段階はチャンピオンズの値。SV は1段階
 *
 * - どくの付与は canInflictStatus / inflictStatus で行う（どく・はがねタイプの免疫・相手の特性・かたやぶり・ふしょく・シンクロなどが効く）
 * - すばやさランクは状態異常付与の成否にかかわらず、applyStatChanges で下げを試みる
 *   （ミラーアーマー・あまのじゃく・クリアボディ・しろいきりなどが効く）
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

    // すばやさランク -2 の試行（特性・しろいきりなどが効く共通の経路を通る）
    const result = await applyStatChanges(
      defender,
      [{ statType: 'speed', rankChange: TOXIC_THREAD_SPEED_DROP }],
      battleContext,
      options,
    );
    const statMessage = joinStatChangeMessages(result);
    if (statMessage) {
      messages.push(statMessage);
    }

    return messages.length > 0 ? messages.join(' ') : null;
  }
}
