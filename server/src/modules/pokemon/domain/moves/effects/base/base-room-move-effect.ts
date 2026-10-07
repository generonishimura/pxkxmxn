import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';

/**
 * 両陣営にかかるルームの残りターン数（本家の pseudoWeather の duration）
 */
const ROOM_TURNS = 5;

/**
 * ルームを張る技の基底クラス（トリックルーム・ワンダールーム）
 *
 * GlobalFieldState[key] に 5 を書く。すでに張っていれば、キーを消してルームを終わらせる（本家の onFieldRestart）。
 * 残りターン数はエンジンがターン終了時に減らし、効果（行動順・防御と特防の入れ替え）もエンジンが行う
 */
export abstract class BaseRoomMoveEffect implements IMoveEffect {
  /**
   * 書くキー
   */
  protected abstract readonly key: 'trickRoomTurns' | 'wonderRoomTurns';

  /**
   * 張ったときのメッセージ
   */
  protected abstract readonly startMessage: string;

  /**
   * 終わらせたときのメッセージ
   */
  protected abstract readonly endMessage: string;

  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    const active = getGlobalFieldState(battle.sideState)[this.key] !== undefined;
    await repository.patchGlobalFieldState(battle.id, { [this.key]: active ? null : ROOM_TURNS });
    return active ? this.endMessage : this.startMessage;
  }
}
