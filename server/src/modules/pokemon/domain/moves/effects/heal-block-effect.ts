import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { moveEffectSource } from './base/base-stat-change-effect';

/** かいふくふうじのターン数（本家の duration） */
const HEAL_BLOCK_TURNS = 5;

/**
 * かいふくふうじ（Heal Block）技の効果
 *
 * 相手を 5 ターンかいふくふうじ状態にする（healBlockTurns）。
 * - すでにかいふくふうじされている相手には失敗する
 * - アロマベールの相手には失敗する（かたやぶりで無視。tryApplyVolatile が判定する）
 * - 回復技を出せなくするのと、HP の回復を止めるのはエンジン（findMoveRestriction・applyHeal）
 *
 * 注: 本家では相手全体が対象の技。シングルバトルなので相手 1 体だけにかける
 */
export class HealBlockEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return defender.volatileState.healBlockTurns !== undefined;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      defender,
      'healBlock',
      { healBlockTurns: HEAL_BLOCK_TURNS },
      battleContext,
      { source: moveEffectSource(attacker, battleContext) },
    );
    return applied ? 'was prevented from healing!' : 'but it failed';
  }
}
