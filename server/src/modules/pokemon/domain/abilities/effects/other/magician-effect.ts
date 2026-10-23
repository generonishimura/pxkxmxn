import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { stealItem } from '../../../battle-events/item-steal';

/**
 * マジシャン（Magician）特性の効果
 * 攻撃技を当てたあと、持ち物を持っていなければ、相手の持ち物を奪う（本家の onAfterMoveSecondarySelf）
 *
 * - 技全体で 1 回、技が当たったとき（onAfterMoveSecondarySelf。ばけのかわで防がれたときを含む）
 * - 自分がひんしなら奪わない。相手がひんしでも奪う（本家と同じ）
 * - 相手のねんちゃく・その種族のメガストーンは奪えない（stealItem → takeItem）
 * - 奪った持ち物の onAfterMoveSecondarySelf（いのちのたまの反動など）は、この技では起きない（エンジンが特性の前に持ち物を見る）
 */
export class MagicianEffect implements IAbilityEffect {
  async onAfterMoveSecondarySelf(
    holder: BattlePokemonStatus,
    target: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.moveCategory === 'Status' || holder.currentHp <= 0) {
      return null;
    }
    const stolen = await stealItem(holder, target, battleContext);
    return stolen === undefined ? null : `マジシャン stole the target's ${stolen}!`;
  }
}
