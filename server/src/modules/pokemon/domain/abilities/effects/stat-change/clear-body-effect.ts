import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';

type StatType =
  | 'attack'
  | 'defense'
  | 'specialAttack'
  | 'specialDefense'
  | 'speed'
  | 'accuracy'
  | 'evasion';

/**
 * クリアボディ（Clear Body）/ しろいけむり（White Smoke）/ メタルプロテクト（Full Metal Body）特性の効果
 * 相手によって能力ランクを下げられない
 *
 * `canReceiveStatChange` フックで、すべての能力の低下を無効化する。
 * 本フックは相手が能力変化を適用する側（`BaseOpponentStatChangeMoveEffect` /
 * `BaseOpponentStatChangeEffect`）でのみ参照されるため、自分の技による低下には影響しない。
 *
 * 注: メタルプロテクトは本来かたやぶりで無視されないが、ここではクリアボディと同じく
 * 攻撃側がかたやぶりを持つと判定がスキップされる。
 */
export class ClearBodyEffect implements IAbilityEffect {
  canReceiveStatChange(
    _pokemon: BattlePokemonStatus,
    _statType: StatType,
    rankChange: number,
    _battleContext?: BattleContext,
  ): boolean | undefined {
    if (rankChange < 0) {
      return false;
    }
    return undefined;
  }
}
