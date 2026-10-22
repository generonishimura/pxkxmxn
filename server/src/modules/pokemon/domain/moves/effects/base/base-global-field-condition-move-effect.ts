import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import {
  GLOBAL_TURN_COUNTER_KEYS,
  getGlobalFieldState,
} from '@/modules/battle/domain/state/side-state';

/**
 * 両陣営にターン数のある場の状態を張る技の基底クラス（どろあそび・みずあそび）
 *
 * GlobalFieldState[key] に turns を書く。すでにその状態なら失敗する（本家の addPseudoWeather）。
 * 残りターン数はエンジンがターン終了時に減らし、効果（威力の補正など）もエンジンが行う
 */
export abstract class BaseGlobalFieldConditionMoveEffect implements IMoveEffect {
  /**
   * 書くキー（GLOBAL_TURN_COUNTER_KEYS のどれか）
   */
  protected abstract readonly key: (typeof GLOBAL_TURN_COUNTER_KEYS)[number];

  /**
   * 書くターン数（本家の duration。使ったターンを含む）
   */
  protected abstract readonly turns: number;

  /**
   * 張ったときのメッセージ
   */
  protected abstract readonly message: string;

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
    if (getGlobalFieldState(battle.sideState)[this.key] !== undefined) {
      return 'But it failed';
    }
    await repository.patchGlobalFieldState(battle.id, { [this.key]: this.turns });
    return this.message;
  }
}
