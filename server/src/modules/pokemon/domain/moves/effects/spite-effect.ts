import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { reducePp } from '../../battle-events/pp';
import { IMoveEffect } from '../move-effect.interface';

/**
 * うらみで減らす PP
 */
const SPITE_PP_REDUCTION = 4;

/**
 * うらみ（Spite）技の効果
 *
 * 相手が最後に使った技（volatileState.lastMoveId）の PP を 4 減らす。残りが 4 より少なければ残りをすべて減らす
 * - 相手がまだ技を使っていなければ失敗する（交代で出てきたばかりのときも）
 * - 最後に使った技の PP が 0 のとき、覚えていない技（わるあがき）のときは失敗する
 * - ものまね・へんしんで入れ替わった技は、入れ替わった技の PP を減らす（reducePp）
 */
export class SpiteEffect implements IMoveEffect {
  shouldFail(_attacker: BattlePokemonStatus, defender: BattlePokemonStatus): boolean {
    return defender.volatileState.lastMoveId === undefined;
  }

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const lastMoveId = defender.volatileState.lastMoveId;
    const reduced =
      lastMoveId === undefined
        ? 0
        : await reducePp(defender, lastMoveId, SPITE_PP_REDUCTION, battleContext);
    return reduced > 0 ? `reduced its PP by ${reduced}!` : 'But it failed';
  }
}
