import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';

/**
 * フェアリーロック（Fairy Lock）技の効果
 *
 * 次のターンの終わりまで、両方のポケモンが交代できなくなる（fairyLockTurns: 2。ゴーストタイプは交代できる）。
 * すでにフェアリーロックの間なら失敗する。交代できなくするのと残りターン数を減らすのはエンジンが行う
 */
export class FairyLockEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    if (getGlobalFieldState(battle.sideState).fairyLockTurns !== undefined) {
      return 'But it failed';
    }
    await repository.patchGlobalFieldState(battle.id, { fairyLockTurns: 2 });
    return 'No one will be able to run away during the next turn!';
  }
}
