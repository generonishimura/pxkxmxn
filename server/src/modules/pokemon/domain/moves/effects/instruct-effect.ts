import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { findMoveSlot, resolveMoveSlots } from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveBehavior, MoveBehaviors } from '../move-behaviors';

/**
 * さいはいで出させられない技の性質（さいはいで出せない技・ため技・反動で動けなくなる技）
 */
const BLOCKING_BEHAVIORS: readonly MoveBehavior[] = ['failInstruct', 'charge', 'recharge'];

/**
 * さいはい（Instruct）技の効果
 * 相手に、相手が最後に出した技をすぐにもう一度出させる
 *
 * - 相手が出した技は、相手が自分で出したのと同じに扱う（callMove の consumePp。PP が減り、lastMoveId なども書く）
 * - 相手の技を出す前の判定（ねむり・まひ・ひるみ・こんらんなど）をする（runBeforeMoveChecks）
 * - 次のときは失敗する: 相手がまだ技を出していない、くちばしキャノンをためている、最後の技がさいはいで出せない技
 *   （failInstruct）・ため技・反動で動けなくなる技、その技がもう技の欄にない、その技の PP が 0
 * 注: シングルバトルなので、相手は技を出させたポケモン（さいはいの使用者）に技を出す
 */
export class InstructEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    _battleContext: BattleContext,
  ): boolean {
    return (
      defender.volatileState.lastMoveId === undefined || defender.volatileState.beakBlast === true
    );
  }

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const lastMoveId = defender.volatileState.lastMoveId;
    const { battleRepository, moveRepository, callMove } = battleContext;
    if (lastMoveId === undefined || !battleRepository || !moveRepository || !callMove) {
      return 'But it failed';
    }
    const move = await moveRepository.findById(lastMoveId);
    if (!move || BLOCKING_BEHAVIORS.some(behavior => MoveBehaviors.has(move.name, behavior))) {
      return 'But it failed';
    }
    const slots = resolveMoveSlots(
      (await battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(defender.id)) ?? [],
      defender.volatileState,
    );
    const slot = findMoveSlot(slots, move.id);
    if (!slot || slot.currentPp <= 0) {
      return 'But it failed';
    }
    return callMove({
      moveId: move.id,
      user: defender,
      calledBy: 'さいはい',
      runBeforeMoveChecks: true,
      consumePp: true,
    });
  }
}
