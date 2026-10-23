import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';

/**
 * ぶきよう（Klutz）特性の効果
 * 持っている持ち物の効果がなくなる（本家の ignoringItem の hasAbility('klutz')）
 *
 * - onEntry（場に出たとき・スキルスワップなどで得たとき）に volatileState.klutz を書く。
 *   isItemSuppressed（battle-events/item-lookup.ts）が見て、resolveItemName・getItemEffect が持ち物を返さなくなる
 * - いえきで特性が消されている間は働かない（isItemSuppressed が abilitySuppressed を見る）
 * - 特性が変わると klutz は消える（ABILITY_STATE_KEYS。startAbility）
 * - メガストーンでメガシンカはできる（メガシンカは heldItemName を見る。本家と同じ）
 * 注: 場に出たときのまきびしなどは、onEntry の前に起きるので、ふうせんがまだ効く（本家は効かない）
 * 注: かがくへんかガスが出てきても klutz を消さないので、持ち物の効果はないまま（本家は戻る）
 */
export class KlutzEffect implements IAbilityEffect {
  async onEntry(pokemon: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    if (pokemon.volatileState.klutz === true) {
      return;
    }
    await battleContext?.battleRepository?.patchVolatileState(pokemon.id, { klutz: true });
  }
}
