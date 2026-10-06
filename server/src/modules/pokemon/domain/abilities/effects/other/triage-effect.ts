import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

/**
 * ヒーリングシフト（Triage）特性の効果
 * 回復技（技フラグ heal。HPを吸い取る攻撃技も含む）の優先度を +3 する
 */
export class TriageEffect implements IAbilityEffect {
  /**
   * 優先度の上がり幅
   */
  private static readonly PRIORITY_BOOST = 3;

  modifyPriority(
    _pokemon: BattlePokemonStatus,
    movePriority: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (battleContext?.moveFlags?.has('heal') !== true) {
      return undefined;
    }
    return movePriority + TriageEffect.PRIORITY_BOOST;
  }
}
