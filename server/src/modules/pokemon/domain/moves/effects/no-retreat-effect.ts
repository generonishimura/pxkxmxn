import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyStatChanges, StatChange } from '../../battle-events/stat-change';
import { joinStatChangeMessages, moveEffectSource } from './base/base-stat-change-effect';

const CHANGES: readonly StatChange[] = [
  { statType: 'attack', rankChange: 1 },
  { statType: 'defense', rankChange: 1 },
  { statType: 'specialAttack', rankChange: 1 },
  { statType: 'specialDefense', rankChange: 1 },
  { statType: 'speed', rankChange: 1 },
];

/**
 * はいすいのじん（No Retreat）技の効果
 *
 * 効果: 自分の攻撃・防御・特攻・特防・素早さを1段階ずつ上げる変化技
 *
 * - ランクの変化は applyStatChanges を通す（あまのじゃく・たんじゅんなどが効く）
 * - 5つの能力がすべて+6なら何も起こらない
 *
 * 注: 使ったあと交代できなくなる効果と、すでに使っていると失敗する点は対象外
 */
export class NoRetreatEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const result = await applyStatChanges(attacker, CHANGES, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return joinStatChangeMessages(result);
  }
}
