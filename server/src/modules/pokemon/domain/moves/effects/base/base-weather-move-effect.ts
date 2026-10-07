import { IMoveEffect } from '../../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { setWeather } from '../../../battle-events/field-state';

/**
 * 天候変更の基底クラス（技用）
 * 変化技を使用したときに天候を変更する汎用的な実装
 *
 * 各技の特殊効果は、このクラスを継承して変更する天候を設定するだけで実装できる
 * setWeather で 5 ターンの残りターン数を書く。ゲンシ天候の間は失敗する（ふつうの天候で上書きできない）
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

    if (await setWeather(battleContext, this.weather)) {
      return this.message;
    }
    // ゲンシ天候の間は失敗する。すでに同じ天候のときは何もしない
    const battle =
      (await battleContext.battleRepository.findById(battleContext.battle.id)) ??
      battleContext.battle;
    return getGlobalFieldState(battle.sideState).primalWeather ? 'But it failed' : null;
  }
}
