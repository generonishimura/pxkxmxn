import { IItemEffect } from '../item-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { modifyByFixedPoint } from '@/modules/battle/domain/logic/fixed-point-modifier';
import { consumeItem } from '../../battle-events/item-lookup';

/**
 * ノーマルジュエル（Normal Gem）
 * ノーマルタイプの攻撃技の威力を 1.3 倍にし、技が当たったら使い切る
 * （第 6 世代から 1.3 倍。本家の gem の chainModify([5325, 4096])）
 *
 * - 威力は技の間ずっと上がる（連続技はすべてのヒット）。使い切るのは技全体のあと（onAfterMoveSecondarySelf）
 * - 外れた・効かなかった技では使い切らない
 * 注: 本家はヒットの直前（TryPrimaryHit）に使い切る。ここでは技のあとに使い切るので、
 *   技の途中で持ち物を見るもの（はたきおとしの威力など）からは、まだ持っているように見える
 */
export class NormalGemEffect implements IItemEffect {
  /**
   * 威力の補正（4096分率。1.3倍 = 5325）
   */
  private static readonly POWER_MODIFIER = 5325;

  private static readonly NORMAL_TYPE_NAME = 'ノーマル';

  modifyBasePower(
    _holder: BattlePokemonStatus,
    power: number,
    battleContext?: BattleContext,
  ): number | undefined {
    if (
      battleContext?.moveTypeName !== NormalGemEffect.NORMAL_TYPE_NAME ||
      battleContext.moveCategory === 'Status'
    ) {
      return undefined;
    }
    return modifyByFixedPoint(power, NormalGemEffect.POWER_MODIFIER);
  }

  async onAfterMoveSecondarySelf(
    holder: BattlePokemonStatus,
    _target: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveTypeName !== NormalGemEffect.NORMAL_TYPE_NAME) {
      return null;
    }
    const consumed = await consumeItem(holder, battleContext);
    return consumed ? 'The Normal Gem strengthened its power!' : null;
  }
}
