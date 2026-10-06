import { BaseStatDropImmunityEffect } from '../base/base-stat-drop-immunity-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import type { StatType } from '@/modules/pokemon/domain/moves/effects/base/base-stat-change-effect';

/**
 * しんがん（Mind's Eye）特性の効果
 * - 相手に命中率ランクを下げられない（相手の技による低下はかたやぶりで無視される）
 * - 自分の技は、相手の回避ランクを無視して命中判定をする
 * - ノーマル・かくとう技がゴーストタイプに等倍で当たる
 */
export class MindsEyeEffect extends BaseStatDropImmunityEffect {
  private static readonly IGNORED_DEFENDER_RANKS: readonly StatType[] = ['evasion'];
  private static readonly PIERCING_MOVE_TYPES: readonly string[] = ['ノーマル', 'かくとう'];
  private static readonly PIERCED_TYPE = 'ゴースト';

  protected readonly protectedStat = 'accuracy' as const;

  ignoreOpponentRanks(
    _pokemon: BattlePokemonStatus,
    role: 'attacker' | 'defender',
    _battleContext?: BattleContext,
  ): readonly StatType[] | undefined {
    return role === 'attacker' ? MindsEyeEffect.IGNORED_DEFENDER_RANKS : undefined;
  }

  ignoresTypeImmunity(
    _pokemon: BattlePokemonStatus,
    moveTypeName: string,
    defenderTypeName: string,
    _battleContext?: BattleContext,
  ): boolean {
    return (
      defenderTypeName === MindsEyeEffect.PIERCED_TYPE &&
      MindsEyeEffect.PIERCING_MOVE_TYPES.includes(moveTypeName)
    );
  }
}
