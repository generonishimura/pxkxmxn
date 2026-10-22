import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';

/**
 * 分け合う実数値（HP は含めない）
 */
export type SplitStat = 'attack' | 'defense' | 'specialAttack' | 'specialDefense';

/**
 * 自分と相手の実数値を、両者の平均（切り捨て）にする技の基底クラス（ガードシェア・パワーシェア）
 *
 * - ランク補正の前の実数値（ctx.attackerStats / defenderStats。パワートリックなどの上書きを反映した値）を使う
 * - 結果は両者の volatileState.statOverrides に書く。ランクは変えない。交代すると元に戻る
 * - ほかの実数値の上書きは残す
 */
export abstract class BaseStatSplitEffect implements IMoveEffect {
  protected abstract readonly stats: readonly SplitStat[];
  protected abstract readonly message: string;

  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const { attackerStats, defenderStats, battleRepository } = battleContext;
    if (!attackerStats || !defenderStats || !battleRepository) {
      return 'But it failed';
    }

    const averaged: Partial<Record<SplitStat, number>> = {};
    for (const stat of this.stats) {
      averaged[stat] = Math.floor((attackerStats[stat] + defenderStats[stat]) / 2);
    }

    await battleRepository.patchVolatileState(attacker.id, {
      statOverrides: { ...attacker.volatileState.statOverrides, ...averaged },
    });
    await battleRepository.patchVolatileState(defender.id, {
      statOverrides: { ...defender.volatileState.statOverrides, ...averaged },
    });

    return this.message;
  }
}
