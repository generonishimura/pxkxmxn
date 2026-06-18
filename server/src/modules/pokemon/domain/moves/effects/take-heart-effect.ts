import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';

/**
 * 「ブレイブチャージ」の特殊効果実装
 *
 * 効果:
 *  - 自分の状態異常を回復する
 *  - 自分の特攻と特防をそれぞれ1段階上昇させる
 *
 * 状態異常回復・能力上昇は独立して試行される（片方が無効でももう片方は実行）
 */
export class TakeHeartEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }

    const messages: string[] = [];
    const updateData: Partial<BattlePokemonStatus> = {};

    if (attacker.statusCondition && attacker.statusCondition !== StatusCondition.None) {
      (updateData as Record<string, unknown>).statusCondition = StatusCondition.None;
      messages.push('user was cured of its status condition!');
    }

    const newSpecialAttackRank = Math.min(6, attacker.specialAttackRank + 1);
    const newSpecialDefenseRank = Math.min(6, attacker.specialDefenseRank + 1);

    if (newSpecialAttackRank !== attacker.specialAttackRank) {
      (updateData as Record<string, number>).specialAttackRank = newSpecialAttackRank;
      messages.push('Special Attack rose!');
    }
    if (newSpecialDefenseRank !== attacker.specialDefenseRank) {
      (updateData as Record<string, number>).specialDefenseRank = newSpecialDefenseRank;
      messages.push('Special Defense rose!');
    }

    if (messages.length === 0) {
      return null;
    }

    await battleContext.battleRepository.updateBattlePokemonStatus(attacker.id, updateData);
    return messages.join(' ');
  }
}
