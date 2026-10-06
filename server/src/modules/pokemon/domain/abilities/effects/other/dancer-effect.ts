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
 * 注: おどりこで出した技は、自分の lastMoveId に書かない（エンジンの callMove の既定のまま）
 */
export class DancerEffect implements IAbilityEffect {
  async onOpponentMoveUsed(
    _holder: BattlePokemonStatus,
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
    return battleContext.callMove({ moveId, calledBy: 'おどりこ', runBeforeMoveChecks: true });
  }
}
