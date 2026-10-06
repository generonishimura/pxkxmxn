import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveBehaviors } from '../move-behaviors';

/**
 * まねっこ（Copycat）技の効果
 * バトルで最後に出た技（どちらのポケモンの技でもよい）を出す
 *
 * - 最後に出た技は GlobalFieldState.lastMoveId（エンジンが行動の終わりに書く。ゆびをふるで出た技なら、その技）
 * - まだ誰も技を出していないときは失敗する
 * - まねっこで出せない技（failCopycat。ゆびをふる・きあいパンチなど）なら失敗する
 */
export class CopycatEffect implements IMoveEffect {
  shouldFail(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return getGlobalFieldState(battleContext.battle.sideState).lastMoveId === undefined;
  }

  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const lastMoveId = getGlobalFieldState(battleContext.battle.sideState).lastMoveId;
    const move =
      lastMoveId === undefined ? null : await battleContext.moveRepository?.findById(lastMoveId);
    if (!move || !battleContext.callMove || MoveBehaviors.has(move.name, 'failCopycat')) {
      return 'But it failed';
    }
    return battleContext.callMove({ moveId: move.id, calledBy: 'まねっこ' });
  }
}
