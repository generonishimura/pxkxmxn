import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { EntryHazard, addEntryHazard } from '../../../battle-events/field-state';

/**
 * 相手の陣営に設置技を置く技の基底クラス
 * （まきびし・どくびし・ステルスロック・ねばねばネット）
 *
 * 相手（defender）の陣営に addEntryHazard で置く。上限（まきびし 3 層・どくびし 2 層・ほかは 1 つ）なら失敗する。
 * 場に出たポケモンへの効果（ダメージ・どく・素早さ -1）と、マジックミラーで跳ね返すのはエンジンが行う
 */
export abstract class BaseEntryHazardMoveEffect implements IMoveEffect {
  /**
   * 置く設置技
   */
  protected abstract readonly hazard: EntryHazard;

  /**
   * 置いたときのメッセージ
   */
  protected abstract readonly message: string;

  async onUse(
    _attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const placed = await addEntryHazard(battleContext, defender.trainerId, this.hazard);
    return placed ? this.message : 'But it failed';
  }
}
