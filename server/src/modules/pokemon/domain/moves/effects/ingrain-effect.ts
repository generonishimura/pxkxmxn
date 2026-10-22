import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * ねをはる（Ingrain）技の効果
 *
 * 使用者が根を張る（ingrain）。すでに根を張っていれば失敗する。
 * 根を張っている間の効果はエンジンが行う。
 * - ターン終了時に最大 HP の 1/16 を回復する（VolatileResidualProcessor）
 * - 交代できない。ゴーストタイプは交代できる（findSwitchBlocker）
 * - 地面にいる扱いになり、ひこうタイプ・でんじふゆうでもじめん技が当たる（volatile-modifiers）
 *
 * 注: 本家では、ほえる・ふきとばしなどで引っ込まなくなる。交代させる技がまだないので、その判定はない
 */
export class IngrainEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return attacker.volatileState.ingrain === true;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(attacker, 'ingrain', { ingrain: true }, battleContext, {
      source: moveEffectSource(attacker, battleContext),
    });
    return applied ? 'planted its roots!' : 'but it failed';
  }
}
