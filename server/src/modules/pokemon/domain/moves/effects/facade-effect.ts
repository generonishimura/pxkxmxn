import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { isMajorStatus } from '@/modules/battle/domain/logic/major-status';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * からげんき（Facade）技の効果
 *
 * 使用者がやけど・まひ・どく・もうどく・こおりのとき、威力が2倍（70 → 140）になる。
 * ねむりのときは2倍にならない（本家と同じ）。
 * やけどによる物理技のダメージ半減も受けない
 */
export class FacadeEffect implements IMoveEffect {
  /**
   * 威力の倍率
   */
  private static readonly POWER_MULTIPLIER = 2;

  readonly ignoresBurnPenalty = true;

  /**
   * 使用者が状態異常（ねむりを除く）なら威力を2倍にする
   */
  modifyMovePower(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const status = attacker.statusCondition;
    const power = battleContext.movePower;
    if (!isMajorStatus(status) || status === StatusCondition.Sleep || power == null) {
      return undefined;
    }
    return power * FacadeEffect.POWER_MULTIPLIER;
  }
}
