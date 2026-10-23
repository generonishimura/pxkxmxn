import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { ItemRegistry } from '../../../items/item-registry';

/**
 * はんすう（Cud Chew）特性の効果
 * きのみを食べると、次のターンのターン終了時に、同じきのみをもう一度食べる（1 回だけ。本家の cudchew）
 *
 * - onEatItem: 食べたきのみと Battle.turn を volatileState.cudChew に書く
 * - onTurnEnd: 食べたターンより後のターンなら、cudChew を消して、きのみの onEat を呼ぶ
 *   （持ち物は使い切ったまま。食べる判定をしないので、相手のきんちょうかんでも食べる。本家と同じ）
 * - 食べ直したきのみは覚えない（eatItem を通らないので onEatItem が呼ばれない）
 * - 交代・特性が変わると覚えたきのみは消える（volatileState。ABILITY_STATE_KEYS）
 * 注: 食べ直したときのメッセージは出さない（onTurnEnd はメッセージを返せない）
 * 注: 本家は、ターン終了時の処理の中で食べたきのみを、次の次のターンに食べ直すことがある（カウンタの数え方）。
 *   ここでは、いつ食べても次のターンのターン終了時に食べ直す
 */
export class CudChewEffect implements IAbilityEffect {
  async onEatItem(
    holder: BattlePokemonStatus,
    itemName: string,
    battleContext: BattleContext,
  ): Promise<string | null> {
    await battleContext.battleRepository?.patchVolatileState(holder.id, {
      cudChew: { itemName, turn: battleContext.battle.turn },
    });
    return null;
  }

  async onTurnEnd(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    const pending = holder.volatileState.cudChew;
    const repository = battleContext?.battleRepository;
    if (!battleContext || !repository || !pending || battleContext.battle.turn <= pending.turn) {
      return;
    }
    const cleared = await repository.patchVolatileState(holder.id, { cudChew: null });
    await ItemRegistry.get(pending.itemName)?.onEat?.(cleared, pending.itemName, battleContext);
  }
}
