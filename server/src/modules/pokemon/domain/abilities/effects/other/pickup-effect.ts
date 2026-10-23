import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { heldItemName } from '../../../battle-events/item-lookup';
import { giveItem } from '../../../battle-events/item-transfer';

/**
 * ものひろい（Pickup）特性の効果
 * ターン終了時に持ち物を持っていなければ、このターンにほかのポケモンが使い切った持ち物を拾う（第 5 世代から。本家の pickup）
 *
 * - 拾う相手: 自分以外の、場にいてひんしでないポケモンで、使い切った持ち物（consumedItem）があり、
 *   使い切ったのがこのターン（volatileState.itemConsumedTurn === battle.turn）のもの。複数いればランダムに 1 匹
 * - 拾ったら、相手の使い切った持ち物を消す（リサイクル・しゅうかくで戻せなくなる。本家の lastItem = ''）
 * - 拾った持ち物は giveItem で持つ（受け取った持ち物の onEntry も呼ぶ）
 * - 奪われた・はたき落とされた持ち物は、使い切った持ち物ではないので拾えない（本家と同じ）
 * 注: 拾ったときのメッセージは出さない（onTurnEnd はメッセージを返せない）
 * 注: ターン終了時の処理はポケモンごとに順に行うので、ものひろいのあとに処理される相手がターン終了時に使い切った持ち物は拾えない
 */
export class PickupEffect implements IAbilityEffect {
  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const repository = battleContext?.battleRepository;
    if (
      !battleContext ||
      !repository ||
      holder.currentHp <= 0 ||
      heldItemName(holder) !== undefined
    ) {
      return;
    }
    const turn = battleContext.battle.turn;
    const statuses = await repository.findBattlePokemonStatusByBattleId(holder.battleId);
    const targets = statuses.filter(
      other =>
        other.id !== holder.id &&
        other.isActive &&
        !other.isFainted() &&
        other.persistentState.consumedItem !== undefined &&
        other.volatileState.itemConsumedTurn === turn,
    );
    if (targets.length === 0) {
      return;
    }
    const target = targets[Math.floor(Math.random() * targets.length)];
    const itemName = target.persistentState.consumedItem;
    if (itemName === undefined) {
      return;
    }
    await repository.patchPersistentState(target.id, { consumedItem: null });
    await giveItem(holder, itemName, battleContext);
  }
}
