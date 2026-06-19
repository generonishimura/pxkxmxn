import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * 「クリアスモッグ」の特殊効果実装
 *
 * 効果: 相手の能力ランクをすべて 0 にリセットする
 */
export class ClearSmogEffect implements IMoveEffect {
  async onHit(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    // 既にすべて 0 の場合は何もしない
    if (
      defender.attackRank === 0 &&
      defender.defenseRank === 0 &&
      defender.specialAttackRank === 0 &&
      defender.specialDefenseRank === 0 &&
      defender.speedRank === 0 &&
      defender.accuracyRank === 0 &&
      defender.evasionRank === 0
    ) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(defender.id, {
      attackRank: 0,
      defenseRank: 0,
      specialAttackRank: 0,
      specialDefenseRank: 0,
      speedRank: 0,
      accuracyRank: 0,
      evasionRank: 0,
    });

    return "target's stat changes were eliminated!";
  }
}
