import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { rollSecondaryEffect } from '../secondary-effect';
import { canInflictStatus, inflictStatus } from '../../battle-events/status-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * トライアタックで付与しうる状態異常
 */
const TRI_ATTACK_STATUS_CONDITIONS: readonly {
  status: StatusCondition;
  message: string;
}[] = [
  { status: StatusCondition.Burn, message: 'was burned!' },
  { status: StatusCondition.Freeze, message: 'was frozen solid!' },
  { status: StatusCondition.Paralysis, message: 'was paralyzed!' },
];

/**
 * トライアタック（Tri Attack）技の効果
 *
 * 効果: 20%の確率でやけど・こおり・まひのいずれか1つをランダムに付与
 * (Has a 20% chance to burn, freeze, or paralyze the target)
 *
 * - 確率判定のあとに3つから1つを選ぶ。選んだ状態異常を付与できなければ、ほかの状態異常は付与しない（本家と同じ）
 * - 付与は canInflictStatus / inflictStatus で行う（タイプの免疫・相手の特性・かたやぶり・シンクロなどが効く）
 */
export class TriAttackEffect implements IMoveEffect {
  private static readonly CHANCE = 0.2;

  async onHit(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository || !battleContext.trainedPokemonRepository) {
      return null;
    }

    if (defender.statusCondition && defender.statusCondition !== StatusCondition.None) {
      return null;
    }

    if (!rollSecondaryEffect(TriAttackEffect.CHANCE, battleContext)) {
      return null;
    }

    // やけど・こおり・まひのいずれかをランダムに選ぶ
    const index = Math.min(
      TRI_ATTACK_STATUS_CONDITIONS.length - 1,
      Math.floor(Math.random() * TRI_ATTACK_STATUS_CONDITIONS.length),
    );
    const config = TRI_ATTACK_STATUS_CONDITIONS[index];
    const options = { source: moveEffectSource(attacker, battleContext) };
    if (!(await canInflictStatus(defender, config.status, battleContext, options))) {
      return null;
    }

    const messages = await inflictStatus(defender, config.status, battleContext, options);
    return [config.message, ...messages].join(' ');
  }
}
