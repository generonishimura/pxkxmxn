import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { MoveBehaviors } from '../../../moves/move-behaviors';

/**
 * おどりこ（Dancer）特性の効果
 * 相手がおどり技（MoveBehaviors の dance）を出したあと、同じ技を自分も続けて出す
 *
 * - 技を出す前の判定（ねむり・まひ・ひるみ・こんらん・ちょうはつなど）をしてから出す（runBeforeMoveChecks）
 * - PP は減らない。相手を対象にする技は、おどり技を出した相手に出す
 * - 相手の技が外れた・失敗したとき、自分が隠れているとき、おどりこで出した技のあとは、エンジンが呼ばない
 * - はなびらのまい（出し続ける技）をまねても、自分は出し続ける状態にならない（本家の runMove の noLock）。
 *   まねる前に出し続けていなかったときだけ、まねたあとに書かれた lockedInMove を消す
 * 注: おどりこで出した技は、自分の lastMoveId に書かない（エンジンの callMove の既定のまま）
 * 注: まねる前から はなびらのまい を出し続けていたときは、エンジンの出し続ける処理（残りターンを減らす）のまま
 */
export class DancerEffect implements IAbilityEffect {
  async onOpponentMoveUsed(
    holder: BattlePokemonStatus,
    _user: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const moveName = battleContext?.moveName;
    const moveId = battleContext?.moveId;
    if (
      !battleContext?.callMove ||
      !moveName ||
      moveId === undefined ||
      !MoveBehaviors.has(moveName, 'dance')
    ) {
      return null;
    }
    const wasLockedIn = holder.volatileState.lockedInMove !== undefined;
    const message = await battleContext.callMove({
      moveId,
      calledBy: 'おどりこ',
      runBeforeMoveChecks: true,
    });
    const battleRepository = battleContext.battleRepository;
    if (!wasLockedIn && battleRepository) {
      const latest = await battleRepository.findBattlePokemonStatusById(holder.id);
      if (latest?.volatileState.lockedInMove?.moveId === moveId) {
        await battleRepository.patchVolatileState(holder.id, { lockedInMove: null });
      }
    }
    return message;
  }
}
