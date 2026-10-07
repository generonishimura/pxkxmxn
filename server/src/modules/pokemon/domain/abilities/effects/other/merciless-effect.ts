import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { BattleContext } from '../../battle-context.interface';
import { ALWAYS_CRITICAL_HIT_STAGE } from '@/modules/battle/domain/logic/critical-hit';

/**
 * 急所が必ず当たる相手の状態異常（どく・もうどく）
 */
const POISON_CONDITIONS: readonly StatusCondition[] = [
  StatusCondition.Poison,
  StatusCondition.BadPoison,
];

/**
 * ひとでなし（Merciless）特性の効果
 * 相手が どく・もうどく のとき、自分の攻撃技が必ず急所に当たる（本家の onModifyCritRatio）
 *
 * - 相手の特性の カブトアーマー・シェルアーマー や、相手の陣営の おまじない があれば急所にならない（エンジンが判定する）
 */
export class MercilessEffect implements IAbilityEffect {
  modifyCritRatio(
    _holder: BattlePokemonStatus,
    _stage: number,
    battleContext?: BattleContext,
  ): number | undefined {
    const statusCondition = battleContext?.defender?.statusCondition;
    if (!statusCondition || !POISON_CONDITIONS.includes(statusCondition)) {
      return undefined;
    }
    return ALWAYS_CRITICAL_HIT_STAGE;
  }
}
