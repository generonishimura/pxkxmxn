import { IAbilityEffect } from '../../ability-effect.interface';
import { BattleContext } from '../../battle-context.interface';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { changeForm } from '../../../battle-events/form-change';
import { getAbilityEffect } from '../../../battle-events/ability-lookup';
import { resolveBattleAbilityName } from '../../../battle-events/battle-traits';

/** ポワルンの全国図鑑の番号 */
const CASTFORM_NATIONAL_DEX = 351;

/**
 * 天候ごとのポワルンのすがた。表にない天候（すなあらし・天候なし）は、もとのすがた（null。既定の 'normal'）
 */
const FORM_BY_WEATHER: Partial<Record<Weather, string>> = {
  [Weather.Sun]: 'sunny',
  [Weather.Rain]: 'rainy',
  [Weather.Hail]: 'snowy',
};

/**
 * てんきや（Forecast）特性の効果
 * ポワルンが、効果のある天候に合わせてすがたを変える（場に出たとき（onEntry）と天候が変わったとき（onWeatherChange））。
 * 晴れ（ひでりの大日照りを含む）→ たいようのすがた（'sunny'）、雨（おおあめを含む）→ あまみずのすがた（'rainy'）、
 * あられ（ゆきの代わり）→ ゆきぐものすがた（'snowy'）、ほか → もとのすがた（null）。
 * 天候が変わったときと場に出たときは、ノーてんき・エアロックが場にいれば天候がないものとして扱う
 * （場に出たときはエンジンが効果のある天候を渡さないので、場のひんしでないポケモンの実効の特性から求める）。
 * フォルムは交代で戻る（volatileState.form）。へんしん中・ポワルンでなければ何もしない
 * 注: ノーてんき・エアロックのポケモンが場に出入りしたときは、すがたを変えない（エンジンが onWeatherChange を呼ばない）。
 *     本家はそのときも天候に合わせてすがたを変える
 * 注: いえきなどで特性が消えた・書き換えられたときに、もとのすがたに戻さない。ばんのうがさの晴れ・雨の無視は扱わない
 * 注: フォルムが変わったメッセージは出ない（onEntry・onWeatherChange はメッセージを返せない）
 */
export class ForecastEffect implements IAbilityEffect {
  async onEntry(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  async onWeatherChange(holder: BattlePokemonStatus, battleContext?: BattleContext): Promise<void> {
    await this.updateForm(holder, battleContext);
  }

  private async updateForm(
    holder: BattlePokemonStatus,
    battleContext?: BattleContext,
  ): Promise<void> {
    if (!battleContext || holder.currentHp <= 0) {
      return;
    }
    const trainedPokemon = await battleContext.trainedPokemonRepository?.findById(
      holder.trainedPokemonId,
    );
    if (trainedPokemon?.pokemon.nationalDex !== CASTFORM_NATIONAL_DEX) {
      return;
    }
    const weather = await this.effectiveWeather(battleContext);
    const form = (weather !== null ? FORM_BY_WEATHER[weather] : undefined) ?? null;
    await changeForm(holder, form, battleContext);
  }

  /**
   * 効果のある天候を求める。コンテキストに天候があればそれを使い（onWeatherChange はエンジンが入れる）、
   * なければバトルの天候を、場のひんしでないポケモンの実効の特性にノーてんき・エアロックがいれば None として読む
   */
  private async effectiveWeather(battleContext: BattleContext): Promise<Weather | null> {
    if (battleContext.weather !== undefined) {
      return battleContext.weather;
    }
    const weather = battleContext.battle?.weather ?? null;
    const repository = battleContext.battleRepository;
    if (weather === null || !repository) {
      return weather;
    }
    const actives = (
      (await repository.findBattlePokemonStatusByBattleId(battleContext.battle.id)) ?? []
    ).filter(status => status.isActive && status.currentHp > 0);
    for (const status of actives) {
      const effect = await getAbilityEffect(await resolveBattleAbilityName(status, battleContext));
      if (effect?.suppressesWeather === true) {
        return Weather.None;
      }
    }
    return weather;
  }
}
