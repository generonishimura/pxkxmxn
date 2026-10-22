import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveLastMoveCopy } from './base/resolve-last-move-copy';

/**
 * スケッチ（Sketch）技の効果
 *
 * 相手が最後に使った技で、スケッチの欄をずっと書き換える（PP はその技の最大 PP。交代しても戻らない）。
 * へんしん中・相手がまだ技を使っていない・スケッチできない技（noSketch）・すでに覚えている技のときは失敗する
 * 注: 書き換えるのはこのバトルの技の欄（BattlePokemonMove）だけで、育成ポケモンの技は変わらない
 */
export class SketchEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const copy = await resolveLastMoveCopy(attacker, defender, battleContext, 'noSketch');
    if (!copy || copy.slot.isOverride) {
      return 'But it failed';
    }
    const { slot, move } = copy;
    await battleContext.battleRepository?.updateBattlePokemonMove(slot.battlePokemonMoveId, {
      moveId: move.id,
      currentPp: move.pp,
      maxPp: move.pp,
    });
    return `sketched ${move.name}!`;
  }
}
