import { IMoveEffect } from '../move-effect.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../abilities/battle-context.interface';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getContextWeather } from '../../abilities/context-weather';

/**
 * 天候ごとのウェザーボールのタイプ
 */
const WEATHER_TYPE_NAMES: Readonly<Partial<Record<Weather, string>>> = {
  [Weather.Sun]: 'ほのお',
  [Weather.Rain]: 'みず',
  [Weather.Sandstorm]: 'いわ',
  [Weather.Hail]: 'こおり',
};

/**
 * ウェザーボール（Weather Ball）技の効果
 *
 * 効果: 天候があるとき、タイプが天候に合わせて変わり、威力が2倍になる（50 → 100）
 * - にほんばれ: ほのお / あめ: みず / すなあらし: いわ / あられ（第9世代のゆき）: こおり
 * 天候は効果のある天候を見るので、ノーてんき・エアロックが場にいればノーマル・威力50のまま
 */
export class WeatherBallEffect implements IMoveEffect {
  modifyMoveType(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): string | undefined {
    return this.weatherTypeName(battleContext);
  }

  modifyMovePower(
    _attacker: BattlePokemonStatus,
    _defender: BattlePokemonStatus,
    battleContext: BattleContext,
  ): number | undefined {
    const basePower = battleContext.movePower;
    if (basePower === null || basePower === undefined || !this.weatherTypeName(battleContext)) {
      return undefined;
    }
    return basePower * 2;
  }

  private weatherTypeName(battleContext: BattleContext): string | undefined {
    const weather = getContextWeather(battleContext);
    return weather ? WEATHER_TYPE_NAMES[weather] : undefined;
  }
}
