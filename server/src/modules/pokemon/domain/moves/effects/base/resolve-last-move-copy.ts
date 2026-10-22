import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import {
  MoveSlot,
  findMoveSlot,
  resolveMoveSlots,
} from '@/modules/battle/domain/logic/move-selection';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Move } from '../../../entities/move.entity';
import { MoveBehavior, MoveBehaviors } from '../../move-behaviors';

/**
 * 相手が最後に使った技を、自分の技の欄に写すときの写し先と写す技
 */
export interface LastMoveCopy {
  /** 今の技（ものまね・スケッチ）の欄 */
  readonly slot: MoveSlot;
  /** 写す技（相手の lastMoveId の技） */
  readonly move: Move;
}

/**
 * 相手が最後に使った技を、今の技の欄に写せるか判定し、写し先と写す技を返す（ものまね・スケッチ）
 *
 * 本家（Showdown）の onHit と同じく、次のときは写せない（undefined）
 * - 使用者がへんしん中
 * - 相手がまだ技を使っていない
 * - 写す技が excludedBehavior を持つ（ものまねは failMimic、スケッチは noSketch）
 * - 使用者がその技をすでに覚えている（入れ替わった技を含む）
 * - 使用者が今の技を覚えていない（ゆびをふるなどで呼ばれた）
 */
export const resolveLastMoveCopy = async (
  attacker: BattlePokemonStatus,
  defender: BattlePokemonStatus,
  battleContext: BattleContext,
  excludedBehavior: MoveBehavior,
): Promise<LastMoveCopy | undefined> => {
  const { battleRepository, moveRepository, moveId } = battleContext;
  const lastMoveId = defender.volatileState.lastMoveId;
  if (
    !battleRepository ||
    !moveRepository ||
    moveId === undefined ||
    lastMoveId === undefined ||
    attacker.volatileState.transformedIntoStatusId !== undefined
  ) {
    return undefined;
  }
  const move = await moveRepository.findById(lastMoveId);
  if (!move || MoveBehaviors.has(move.name, excludedBehavior)) {
    return undefined;
  }
  const slots = resolveMoveSlots(
    await battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id),
    attacker.volatileState,
  );
  const slot = findMoveSlot(slots, moveId);
  if (!slot || findMoveSlot(slots, move.id)) {
    return undefined;
  }
  return { slot, move };
};
