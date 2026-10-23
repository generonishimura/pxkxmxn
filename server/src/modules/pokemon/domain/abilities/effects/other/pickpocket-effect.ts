import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { HitResult } from '../../../battle-events/hit-result';
import { stealItem } from '../../../battle-events/item-steal';

/**
 * わるいてぐせ（Pickpocket）特性の効果
 * 接触技を受けたあと、持ち物を持っていなければ、攻撃側の持ち物を奪う（本家の onAfterMoveSecondary）
 *
 * - 技全体で 1 回、HP が減ったとき（onAfterMoveHit）。みがわりに当たった技では起きない
 * - 接触したか（hit.isContact）で見る。えんかくなどで接触しなかった技では奪わない
 * - 自分がひんしなら奪わない。攻撃側のねんちゃく・その種族のメガストーンは奪えない（stealItem → takeItem）
 * - ちからずくで追加効果が消えた技では奪わない（本家は AfterMoveSecondary が起きない）
 * 注: ドラゴンテール・ともえなげで交代させられるときも奪う（本家は forceSwitchFlag で奪わない）
 */
export class PickpocketEffect implements IAbilityEffect {
  async onAfterMoveHit(
    holder: BattlePokemonStatus,
    attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (
      !battleContext ||
      !hit.isContact ||
      battleContext.secondaryEffectsRemoved === true ||
      holder.currentHp <= 0
    ) {
      return null;
    }
    const stolen = await stealItem(holder, attacker, battleContext);
    return stolen === undefined ? null : `わるいてぐせ stole the attacker's ${stolen}!`;
  }
}
