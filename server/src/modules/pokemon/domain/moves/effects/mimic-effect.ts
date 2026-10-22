import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveLastMoveCopy } from './base/resolve-last-move-copy';

/**
 * ものまね（Mimic）技の効果
 *
 * 相手が最後に使った技を、ものまねの欄に入れる（PP はその技の最大 PP）。
 * 引っ込むと元のものまねに戻るので、volatileState.moveSlotOverrides に置く。
 * へんしん中・相手がまだ技を使っていない・まねできない技（failMimic）・すでに覚えている技のときは失敗する
 */
export class MimicEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const copy = await resolveLastMoveCopy(attacker, defender, battleContext, 'failMimic');
    if (!copy) {
      return 'But it failed';
    }
    const { slot, move } = copy;
    await battleContext.battleRepository?.patchVolatileState(attacker.id, {
      moveSlotOverrides: [
        ...(attacker.volatileState.moveSlotOverrides ?? []),
        {
          battlePokemonMoveId: slot.battlePokemonMoveId,
          moveId: move.id,
          currentPp: move.pp,
          maxPp: move.pp,
        },
      ],
    });
    return `learned ${move.name}!`;
  }
}
