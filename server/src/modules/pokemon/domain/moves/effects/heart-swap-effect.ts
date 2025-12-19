import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「ハートスワップ」の特殊効果実装
 *
 * 効果: ユーザーとターゲットのステータス変化を交換
 */
export class HeartSwapEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 一時的に相手のステータスランクを保存
    const defenderAttackRank = defender.attackRank;
    const defenderDefenseRank = defender.defenseRank;
    const defenderSpecialAttackRank = defender.specialAttackRank;
    const defenderSpecialDefenseRank = defender.specialDefenseRank;
    const defenderSpeedRank = defender.speedRank;
    const defenderAccuracyRank = defender.accuracyRank;
    const defenderEvasionRank = defender.evasionRank;

    // 自分のステータスランクを相手にコピー
    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      attackRank: attacker.attackRank,
      defenseRank: attacker.defenseRank,
      specialAttackRank: attacker.specialAttackRank,
      specialDefenseRank: attacker.specialDefenseRank,
      speedRank: attacker.speedRank,
      accuracyRank: attacker.accuracyRank,
      evasionRank: attacker.evasionRank,
    });

    // 相手のステータスランクを自分にコピー
    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      attackRank: defenderAttackRank,
      defenseRank: defenderDefenseRank,
      specialAttackRank: defenderSpecialAttackRank,
      specialDefenseRank: defenderSpecialDefenseRank,
      speedRank: defenderSpeedRank,
      accuracyRank: defenderAccuracyRank,
      evasionRank: defenderEvasionRank,
    });

    return 'The user switched stat changes with the target!';
  }
}

