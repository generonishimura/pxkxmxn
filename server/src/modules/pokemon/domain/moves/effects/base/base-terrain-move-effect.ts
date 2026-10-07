import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { setTerrain } from '../../../battle-events/field-state';

/**
 * フィールドを出す技の基底クラス（エレキフィールド・グラスフィールド・サイコフィールド・ミストフィールド）
 *
 * setTerrain で Battle.field と 5 ターンの残りターン数を書く。すでに同じフィールドなら失敗する（本家と同じ）。
 * フィールドの効果（威力・状態異常の防止・先制技の防止・回復）と終わりはエンジンが行う
 */
export abstract class BaseTerrainMoveEffect implements IMoveEffect {
  /**
   * 出すフィールド
   */
  protected abstract readonly field: Field;

  /**
   * 出したときのメッセージ
   */
  protected abstract readonly message: string;

  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    return (await setTerrain(battleContext, this.field)) ? this.message : 'But it failed';
  }
}
