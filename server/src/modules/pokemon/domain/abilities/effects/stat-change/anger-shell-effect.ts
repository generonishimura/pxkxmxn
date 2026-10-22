import { IAbilityEffect } from '../../ability-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { applyStatChanges } from '../../../battle-events/stat-change';
import { joinStatChangeMessages } from '../../../moves/effects/base/base-stat-change-effect';

/**
 * いかりのこうら（Anger Shell）特性の効果
 * 相手の技を受けて、HPが最大HPの半分を上回る状態から半分以下になったとき、
 * 攻撃・特攻・素早さを1段階上げ、防御・特防を1段階下げる
 *
 * - 連続技でも、技のすべてのヒットのあとに1回だけ判定する（本家と同じ）
 * - 技を受ける前からHPが半分以下なら発動しない。ひんしになったときも発動しない
 * 注: 本家ではちからずくで追加効果が消えた技では発動しないが、ここでは区別しない
 */
export class AngerShellEffect implements IAbilityEffect {
  async onAfterMoveHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    const half = holder.maxHp / 2;
    if (!battleContext || holder.currentHp <= 0) {
      return null;
    }
    if (!(hit.hpBefore > half && holder.currentHp <= half)) {
      return null;
    }

    const result = await applyStatChanges(
      holder,
      [
        { statType: 'attack', rankChange: 1 },
        { statType: 'specialAttack', rankChange: 1 },
        { statType: 'speed', rankChange: 1 },
        { statType: 'defense', rankChange: -1 },
        { statType: 'specialDefense', rankChange: -1 },
      ],
      battleContext,
      { source: { pokemon: holder, kind: 'ability', name: 'いかりのこうら' } },
    );
    return joinStatChangeMessages(result);
  }
}
