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
 * 本フックは、能力ランクを変える共通の処理 `applyStatChanges`（battle-events/stat-change.ts）が、
 * 相手が起こした低下に対してだけ能力ごとに呼ぶ。そのため自分の技による低下には影響しない。
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
