import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveBehaviors } from '../move-behaviors';

/**
 * オウムがえし（Mirror Move）技の効果
 *
 * 相手が最後に使った技（lastMoveId）を、相手に向けて callMove で出す。
 * 相手がまだ技を使っていない、またはまねできない技（MoveBehaviors の mirror でない）なら失敗する
 * 注: 相手がみがわり中だと、エンジンが相手を対象にする変化技として失敗させる（本家は、みがわりの判定の前に技を出す）
 */
export class MirrorMoveEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const lastMoveId = defender.volatileState.lastMoveId;
    const move =
      lastMoveId !== undefined ? await battleContext.moveRepository?.findById(lastMoveId) : null;
    if (!move || !MoveBehaviors.has(move.name, 'mirror') || !battleContext.callMove) {
      return 'But it failed';
    }
    return battleContext.callMove({ moveId: move.id, calledBy: 'オウムがえし', target: defender });
  }
}
