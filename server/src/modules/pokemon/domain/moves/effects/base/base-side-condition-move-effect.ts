import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import {
  SIDE_TURN_COUNTER_KEYS,
  getSideConditions,
} from '@/modules/battle/domain/state/side-state';

/**
 * 自分の陣営にターン数のある守りを張る技の基底クラス
 * （リフレクター・ひかりのかべ・オーロラベール・おいかぜ・しんぴのまもり・しろいきり・おまじない）
 *
 * 使用者の陣営の SideConditions[key] に turns を書く。すでに張っていれば失敗する。
 * 残りターン数はエンジンがターン終了時に減らし、効果（ダメージ半減・素早さ 2 倍など）もエンジンが行う
 */
export abstract class BaseSideConditionMoveEffect implements IMoveEffect {
  /**
   * 書くキー（SIDE_TURN_COUNTER_KEYS のどれか）
   */
  protected abstract readonly key: (typeof SIDE_TURN_COUNTER_KEYS)[number];

  /**
   * 書くターン数（本家の duration。使ったターンを含む）
   */
  protected abstract readonly turns: number;

  /**
   * 張ったときのメッセージ
   */
  protected abstract readonly message: string;

  async onUse(
    attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    const repository = battleContext.battleRepository;
    if (!repository) {
      return null;
    }
    const battle = (await repository.findById(battleContext.battle.id)) ?? battleContext.battle;
    if (getSideConditions(battle.sideState, attacker.trainerId)[this.key] !== undefined) {
      return 'But it failed';
    }
    await repository.patchSideConditions(battle.id, attacker.trainerId, {
      [this.key]: this.turns,
    });
    return this.message;
  }
}
