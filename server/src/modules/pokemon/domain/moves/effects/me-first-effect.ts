import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { MoveCategory } from '../../entities/move.entity';
import { MoveBehaviors } from '../move-behaviors';

/**
 * さきどり（Me First）技の効果
 * 相手がこのターンに出す予定のダメージ技を、相手より先に威力 1.5 倍で出す
 *
 * - 相手がもう行動した・行動しない（ctx.defenderPendingMoveId がない）ときは失敗する
 * - 相手が反動で動けないターン（mustRecharge）は失敗する
 * - 出す予定の技が変化技、またはさきどりで出せない技（failMeFirst）なら失敗する
 * - 威力の 1.5 倍は callMove の powerMultiplier で掛ける（4096 分率）
 */
export class MeFirstEffect implements IMoveEffect {
  private static readonly POWER_MULTIPLIER = 1.5;

  shouldFail(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): boolean {
    return (
      battleContext.defenderPendingMoveId === undefined ||
      defender.volatileState.mustRecharge === true
    );
  }

  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const pendingMoveId = battleContext.defenderPendingMoveId;
    const move =
      pendingMoveId === undefined
        ? null
        : await battleContext.moveRepository?.findById(pendingMoveId);
    if (
      !move ||
      !battleContext.callMove ||
      move.category === MoveCategory.Status ||
      MoveBehaviors.has(move.name, 'failMeFirst')
    ) {
      return 'But it failed';
    }
    return battleContext.callMove({
      moveId: move.id,
      calledBy: 'さきどり',
      powerMultiplier: MeFirstEffect.POWER_MULTIPLIER,
    });
  }
}
