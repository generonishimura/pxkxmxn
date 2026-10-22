import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * スピードスワップ（Speed Swap）技の効果
 * 自分と相手の素早さの実数値を入れ替える。ランクは入れ替えない。交代するまで続く
 *
 * - ランク補正の前の実数値（ctx.attackerStats / defenderStats。上書きを反映した値）を入れ替え、
 *   両者の volatileState.statOverrides.speed に書く。行動順はエンジンがこの値で決める
 * - ほかの実数値の上書きは残す
 */
export class SpeedSwapEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const { attackerStats, defenderStats, battleRepository } = battleContext;
    if (!attackerStats || !defenderStats || !battleRepository) {
      return 'But it failed';
    }

    await battleRepository.patchVolatileState(attacker.id, {
      statOverrides: { ...attacker.volatileState.statOverrides, speed: defenderStats.speed },
    });
    await battleRepository.patchVolatileState(defender.id, {
      statOverrides: { ...defender.volatileState.statOverrides, speed: attackerStats.speed },
    });

    return 'switched Speed with its target!';
  }
}
