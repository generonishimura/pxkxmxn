import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { applyVolatile } from '../../battle-events/volatile-infliction';
import { IMoveEffect } from '../move-effect.interface';

/**
 * とぎすますの効果が続くターン数（使ったターンと次のターン。ターン終了時にエンジンが減らす）
 */
const LASER_FOCUS_TURNS = 2;

/**
 * とぎすます（Laser Focus）技の効果
 * 使ったターンと次のターンに使う攻撃技が必ず急所になる（volatileState.laserFocusTurns: 2）。
 * とぎすましている間にもう一度使っても成功し、残りを 2 に書き直して次のターンまで延びる（本家の onRestart）
 *
 * 急所の判定はエンジンの baseCriticalHitStage が laserFocusTurns を読んで行う
 */
export class LaserFocusEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (attacker.currentHp <= 0 || !battleContext.battleRepository) {
      return 'But it failed';
    }
    await applyVolatile(attacker, { laserFocusTurns: LASER_FOCUS_TURNS }, battleContext);
    return 'concentrated intensely!';
  }
}
