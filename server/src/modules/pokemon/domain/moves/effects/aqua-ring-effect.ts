import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/**
 * アクアリング（Aqua Ring）技の効果
 *
 * 使用者が水のベールをまとう（aquaRing）。すでにまとっていれば失敗する。
 * ターン終了時に最大 HP の 1/16 を回復するのはエンジン（VolatileResidualProcessor。かいふくふうじ中は回復しない）
 */
export class AquaRingEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return attacker.volatileState.aquaRing === true;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      attacker,
      'aquaRing',
      { aquaRing: true },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'surrounded itself with a veil of water!' : 'but it failed';
  }
}
