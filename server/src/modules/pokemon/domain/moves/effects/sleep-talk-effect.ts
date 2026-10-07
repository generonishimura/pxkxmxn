import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { getEffectiveStatusCondition } from '../../battle-events/effective-status';
import { MoveBehaviors } from '../move-behaviors';

/**
 * ねごと（Sleep Talk）技の効果
 * ねむっている間だけ使え、自分の技の欄から 1 つを乱数で選んで出す
 *
 * - ねむり（ぜったいねむりを含む）でなければ失敗する。ねむっていても出せるのはエンジン（sleepUsable）
 * - 候補は技の欄（ものまねなどの入れ替えを反映）の技。ねごとで出せない技（noSleepTalk）とため技（charge）は除く
 * - 本家と同じく、PP が 0 の技も選べる。呼んだ技の PP は減らない
 * - 候補がなければ失敗する
 */
export class SleepTalkEffect implements IMoveEffect {
  shouldFail(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return getEffectiveStatusCondition(attacker, battleContext) !== StatusCondition.Sleep;
  }

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const { battleRepository, moveRepository, callMove } = battleContext;
    if (!battleRepository || !moveRepository || !callMove) {
      return 'But it failed';
    }
    const slots = resolveMoveSlots(
      (await battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id)) ?? [],
      attacker.volatileState,
    );
    const candidateIds: number[] = [];
    for (const slot of slots) {
      const move = await moveRepository.findById(slot.moveId);
      if (
        move &&
        !MoveBehaviors.has(move.name, 'noSleepTalk') &&
        !MoveBehaviors.has(move.name, 'charge')
      ) {
        candidateIds.push(move.id);
      }
    }
    if (candidateIds.length === 0) {
      return 'But it failed';
    }
    const moveId = candidateIds[Math.floor(Math.random() * candidateIds.length)];
    return callMove({ moveId, calledBy: 'ねごと' });
  }
}
