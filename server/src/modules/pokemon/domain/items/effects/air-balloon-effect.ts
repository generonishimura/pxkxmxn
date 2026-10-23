import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { isGrounded } from '@/modules/battle/domain/logic/grounded';
import { BattleContext } from '../../abilities/battle-context.interface';
import { HitResult } from '../../battle-events/hit-result';
import { consumeItem } from '../../battle-events/item-lookup';
import { IItemEffect } from '../item-effect.interface';

/**
 * ふうせん（Air Balloon）
 * 持っている間は地面にいない（じめん技を受けない・まきびしやフィールドの効果を受けない）。
 * 攻撃技でダメージを受けると割れる（使い切る）
 *
 * - 地面にいないことは isGrounded（grounded.ts）が持ち物の名前で判定する
 * - じゅうりょくの間・ねをはっている間は地面にいるので、じめん技を受ける（本家の isGrounded と同じ）
 * - 持ち物はかたやぶりで無視されない
 * - みがわりに当たったときは割れない（エンジンが onDamagingHit を呼ばない）
 * 注: 本家は、みがわりに当たったときも割れる（onAfterSubDamage）。ここでは割れない
 * 注: 場に出たときの「ふうせんで浮いている」のメッセージは出さない
 */
export class AirBalloonEffect implements IItemEffect {
  private static readonly GROUND_TYPE_NAME = 'じめん';

  isImmuneToType(
    holder: BattlePokemonStatus,
    typeName: string,
    battleContext?: BattleContext,
  ): boolean {
    if (typeName !== AirBalloonEffect.GROUND_TYPE_NAME) {
      return false;
    }
    // タイプ・特性は見ず、ふうせんで浮いているか（じゅうりょく・ねをはるで地面にいないか）だけを見る
    return !isGrounded({
      typeNames: [],
      itemName: 'ふうせん',
      volatileState: holder.volatileState,
      sideState: battleContext?.battle?.sideState,
    });
  }

  async onDamagingHit(
    holder: BattlePokemonStatus,
    _attacker: BattlePokemonStatus,
    hit: HitResult,
    battleContext?: BattleContext,
  ): Promise<string | null> {
    if (!battleContext || hit.damage <= 0) {
      return null;
    }
    const itemName = await consumeItem(holder, battleContext);
    return itemName === undefined ? null : `${itemName} popped!`;
  }
}
