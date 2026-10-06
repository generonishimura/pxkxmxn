import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * サイコシフト（Psycho Shift）技の効果
 *
 * 効果: 自分の状態異常を相手に移し、自分の状態異常を治す
 *
 * - 付与は canInflictStatus / inflictStatus で行う（タイプの免疫・相手の特性・かたやぶり・シンクロなどが効く）
 * - 相手に移せなければ失敗し、自分の状態異常も治らない
 * - 相手に移してから自分を治す。相手がシンクロでも、その時点では自分がまだ状態異常なのでうつし返されない（本家と同じ）
 */
export class PsychoShiftEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 自分に状態異常がない場合は何もしない
    const statusCondition = attacker.statusCondition;
    if (!statusCondition || statusCondition === StatusCondition.None) {
      return null;
    }

    // 相手に移せるか（すでに状態異常・タイプ・特性。使用者のかたやぶり・ふしょくを考慮する）
    const options = { source: moveEffectSource(attacker, battleContext) };
    if (!(await canInflictStatus(defender, statusCondition, battleContext, options))) {
      return null;
    }

    // 相手に移し、付与されたあとの特性（シンクロなど）のメッセージを足す
    const messages = await inflictStatus(defender, statusCondition, battleContext, options);

    // 自分の状態異常を解除
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      statusCondition: StatusCondition.None,
    });

    return ['The user transferred its status condition to the target!', ...messages].join(' ');
  }
}
