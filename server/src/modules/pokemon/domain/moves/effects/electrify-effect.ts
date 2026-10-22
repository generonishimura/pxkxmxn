import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * そうでん（Electrify）技の効果
 *
 * 効果: 相手がこのターンに出す技を、どのタイプでもでんき技にする（わるあがきを除く）
 * - 相手がこのターンにもう行動していれば失敗する。ただし、このターンに交代で出た相手には成功する（本家の onTryHit の activeTurns）
 * - 技のタイプを変えるのはエンジン（相手の volatileState.electrified。ターン終了時に消える）
 */
export class ElectrifyEffect implements IMoveEffect {
  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const willMove = battleContext.defenderPendingMoveId !== undefined;
    const switchedInThisTurn = defender.volatileState.switchedInTurn === battleContext.battle.turn;
    if (!willMove && !switchedInThisTurn) {
      return 'But it failed';
    }
    await repository.patchVolatileState(defender.id, { electrified: true });
    return 'moves have been electrified!';
  }
}
