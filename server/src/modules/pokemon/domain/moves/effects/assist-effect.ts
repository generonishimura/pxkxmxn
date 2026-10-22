import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Move } from '../../entities/move.entity';
import { MoveBehaviors } from '../move-behaviors';

/**
 * ねこのて（Assist）技の効果
 *
 * 自分以外の味方（控え。ひんしのポケモンも含む）が覚えている技から、ねこのてで選ばれない技（noAssist）を除いて
 * 技の欄ごとに等しい確率で一つを選び、callMove で出す（同じ技を覚えている味方が多いほど選ばれやすい）。
 * 候補がなければ失敗する
 */
export class AssistEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const { battleRepository, moveRepository, callMove } = battleContext;
    if (!battleRepository || !moveRepository || !callMove) {
      return 'But it failed';
    }
    const allies = (
      await battleRepository.findBattlePokemonStatusByBattleId(battleContext.battle.id)
    ).filter(pokemon => pokemon.trainerId === attacker.trainerId && pokemon.id !== attacker.id);
    const allyMoveSlots = (
      await Promise.all(
        allies.map(ally => battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(ally.id)),
      )
    ).flat();
    const allyMoves = await Promise.all(
      allyMoveSlots.map(slot => moveRepository.findById(slot.moveId)),
    );
    const candidates = allyMoves.filter(
      (move): move is Move => move !== null && !MoveBehaviors.has(move.name, 'noAssist'),
    );
    if (candidates.length === 0) {
      return 'But it failed';
    }
    const move = candidates[Math.floor(Math.random() * candidates.length)];
    return callMove({ moveId: move.id, calledBy: 'ねこのて' });
  }
}
