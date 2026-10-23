import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { rollSecondaryEffect } from '../../secondary-effect';
import { canInflictStatus, inflictStatus } from '../../../battle-events/status-infliction';
import { moveEffectSource } from './base-stat-change-effect';

/**
 * 候補の状態異常 1 つ分（付与する状態異常と、付与したときのメッセージ）
 */
export interface RandomStatusConditionCandidate {
  readonly status: StatusCondition;
  readonly message: string;
}

/**
 * 確率に当たったら、候補の状態異常から 1 つをランダムに選んで付与する技の基底クラス
 * （トライアタック・フェイタルクロー）
 *
 * - 確率判定のあとに候補から 1 つを選ぶ。選んだ状態異常を付与できなければ、ほかの状態異常は付与しない（本家と同じ）
 * - 付与は canInflictStatus / inflictStatus で行う（タイプの免疫・相手の特性・かたやぶり・シンクロなどが効く）
 */
export abstract class BaseRandomStatusConditionEffect implements IMoveEffect {
  /**
   * 付与確率（0.0-1.0）
   */
  protected abstract readonly chance: number;

  /**
   * 候補の状態異常（同じ確率で 1 つを選ぶ）
   */
  protected abstract readonly candidates: readonly RandomStatusConditionCandidate[];

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

    if (!rollSecondaryEffect(this.chance, battleContext)) {
      return null;
    }

    const index = Math.min(
      this.candidates.length - 1,
      Math.floor(Math.random() * this.candidates.length),
    );
    const candidate = this.candidates[index];
    const options = { source: moveEffectSource(attacker, battleContext) };
    if (!(await canInflictStatus(defender, candidate.status, battleContext, options))) {
      return null;
    }

    const messages = await inflictStatus(defender, candidate.status, battleContext, options);
    return [candidate.message, ...messages].join(' ');
  }
}
