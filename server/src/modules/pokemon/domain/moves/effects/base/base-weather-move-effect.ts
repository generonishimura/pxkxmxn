import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { setWeather } from '../../../battle-events/field-state';

/**
 * 天候変更の基底クラス（技用）
 * 変化技を使用したときに天候を変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承して変更する天候を設定するだけで実装できる
 * setWeather で 5 ターンの残りターン数を書く。すでに同じ天候のときと、ゲンシ天候の間は失敗する（本家と同じ）
 */
export abstract class BaseWeatherMoveEffect implements IMoveEffect {
  /**
   * 変更する天候
   */
  protected abstract readonly weather: Weather;

  /**
   * 天候変更時のメッセージ
   */
  protected abstract readonly message: string;

  /**
   * 変化技を使用したときに発動
   * 天候を変更
   */
  async onUse(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): Promise<string | null> {
    // バトルリポジトリがない場合は処理しない
    if (!battleContext.battleRepository) {
      return null;
    }

    // すでに同じ天候のときと、ゲンシ天候の間（ふつうの天候で上書きできない）は失敗する
    return (await setWeather(battleContext, this.weather)) ? this.message : 'But it failed';
  }
}
