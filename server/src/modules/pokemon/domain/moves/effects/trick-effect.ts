import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { resolveAbilityName } from '../../battle-events/ability-lookup';
import { blocksItemRemoval, swapItems } from '../../battle-events/item-transfer';

/**
 * トリック（Trick）・すりかえ（Switcheroo）技の効果
 *
 * 使用者と相手の持ち物を入れ替える（swapItems）。片方だけが持っていれば、もう片方に移す。
 * - 相手がねんちゃくなら、相手が持ち物を持っていなくても失敗する（本家の onTryImmunity。かたやぶりで無視される）
 * - どちらも持ち物を持っていない・どちらかの持ち物を動かせない（その種族のメガストーン）なら失敗する
 * - みがわりに防がれる（エンジンが判定する）
 * - 持ち物の効果が消されていても（さしおさえ）入れ替えられる
 * - 入れ替えると、両者のこだわりの固定が解ける。こだわりの持ち物を受け取った相手は、次に出した技に固定される
 */
export class TrickEffect implements IMoveEffect {
  async onUse(
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    if (!battleContext.battleRepository) {
      return null;
    }
    if (await blocksItemRemoval(defender, attacker, battleContext)) {
      return `But it failed (${await resolveAbilityName(defender, battleContext)})`;
    }
    const swapped = await swapItems(attacker, defender, battleContext);
    if (!swapped) {
      return 'But it failed';
    }
    const obtained = [
      ...(swapped.sourceItem === undefined ? [] : [`The target obtained ${swapped.sourceItem}.`]),
      ...(swapped.targetItem === undefined ? [] : [`The user obtained ${swapped.targetItem}.`]),
    ];
    return ['switched items with its target!', ...obtained].join(' ');
  }
}
