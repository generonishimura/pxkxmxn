import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「パワースワップ」の特殊効果実装
 *
 * 効果: ユーザーと相手の「攻撃」と「特攻」のランク変化を交換する
 */
export class PowerSwapEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const attackerAttack = attacker.attackRank;
    const attackerSpecialAttack = attacker.specialAttackRank;

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      attackRank: attackerAttack,
      specialAttackRank: attackerSpecialAttack,
    });
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      attackRank: defender.attackRank,
      specialAttackRank: defender.specialAttackRank,
    });

    return 'The user swapped Attack and Special Attack changes with the target!';
  }
}
