import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';

/**
 * ソウルビート（Clangorous Soul）技の効果
 *
 * 効果: 最大 HP の 1/3（切り捨て、最低 1）を支払い、攻撃・防御・特攻・特防・素早さを 1 段階ずつ上げる
 *
 * - 現在 HP が支払う HP 以下なら失敗（最大 HP が 1 なら、支払う HP も 1 なので失敗）
 * - 5 つの能力が全て既に +6 なら失敗
 * - 失敗したときは 'But it failed' を返す（null はエンジンで成功として扱われるため）
 *
 * 支払う HP は、Bulbapedia などの資料の記載（最大 HP の 1/3、切り捨て）に合わせる。
 * Pokemon Showdown は最大 HP × 33 / 100 で計算するが、それでは最大 HP 300 で 99 になり 1/3 と一致しない
 */
export class ClangorousSoulEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const hpCost = Math.max(1, Math.floor(attacker.maxHp / 3));
    if (attacker.currentHp <= hpCost) {
      return 'But it failed';
    }

    const clampUp = (current: number): number => Math.min(6, current + 1);

    const newAttackRank = clampUp(attacker.attackRank);
    const newDefenseRank = clampUp(attacker.defenseRank);
    const newSpecialAttackRank = clampUp(attacker.specialAttackRank);
    const newSpecialDefenseRank = clampUp(attacker.specialDefenseRank);
    const newSpeedRank = clampUp(attacker.speedRank);

    if (
      newAttackRank === attacker.attackRank &&
      newDefenseRank === attacker.defenseRank &&
      newSpecialAttackRank === attacker.specialAttackRank &&
      newSpecialDefenseRank === attacker.specialDefenseRank &&
      newSpeedRank === attacker.speedRank
    ) {
      return 'But it failed';
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, {
      currentHp: attacker.currentHp - hpCost,
      attackRank: newAttackRank,
      defenseRank: newDefenseRank,
      specialAttackRank: newSpecialAttackRank,
      specialDefenseRank: newSpecialDefenseRank,
      speedRank: newSpeedRank,
    });

    return 'user cut its HP and raised all of its stats!';
  }
}
