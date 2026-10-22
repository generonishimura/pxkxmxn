import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { FOCUS_ENERGY_CRIT_STAGE_BOOST } from '@/modules/battle/domain/logic/critical-hit';
import { BattleContext } from '../../abilities/battle-context.interface';
import { tryApplyVolatile } from '../../battle-events/volatile-infliction';
import { IMoveEffect } from '../move-effect.interface';

/**
 * きあいだめ（Focus Energy）技の効果
 * 使用者の急所ランクを 2 上げる（volatileState.critStageBoost: 2）。交代するまで続き、バトンタッチで引き継ぐ。
 * すでにきあいだめしていたら失敗する（本家と同じ）
 *
 * 急所ランクの計算はエンジンの baseCriticalHitStage が critStageBoost を読んで行う
 */
export class FocusEnergyEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const applied = await tryApplyVolatile(
      attacker,
      'focusEnergy',
      { critStageBoost: FOCUS_ENERGY_CRIT_STAGE_BOOST },
      battleContext,
      { source: { pokemon: attacker, kind: 'move', name: 'きあいだめ' } },
    );
    return applied ? 'is getting pumped!' : 'But it failed';
  }
}
