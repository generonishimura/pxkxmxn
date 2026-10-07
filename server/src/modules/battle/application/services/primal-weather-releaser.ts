import { Weather } from '../../domain/entities/battle.entity';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { getGlobalFieldState } from '../../domain/state/side-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';

/**
 * PrimalWeatherReleaser
 * ゲンシ天候を出したポケモンが場を離れたとき（交代・ひんし）に、天候を終わらせる
 * PokemonSwitcherService（交代・設置技でのひんし）と ExecuteTurnUseCase（技・ターン終了時のひんし）が呼ぶ
 *
 * 本家の primordialsea などの onEnd と同じく、場に同じゲンシ天候の特性（IAbilityEffect.primalWeather）の
 * ポケモンが残っていれば、そのポケモンに引き継ぐ。いなければ Battle.weather を None にし、
 * primalWeather と weatherSourceStatusId を消す
 */
export class PrimalWeatherReleaser {
  constructor(
    private readonly battleRepository: IBattleRepository,
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * @param leavingStatusId 場を離れた（ひんしになった）ポケモンの BattlePokemonStatus の ID
   */
  async release(battleId: number, leavingStatusId: number): Promise<void> {
    const battle = await this.battleRepository.findById(battleId);
    if (!battle) {
      return;
    }
    const global = getGlobalFieldState(battle.sideState);
    if (global.weatherSourceStatusId !== leavingStatusId || global.primalWeather === undefined) {
      return;
    }
    const statuses =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battleId)) ?? [];
    for (const status of statuses) {
      if (status.id === leavingStatusId || !status.isActive || status.isFainted()) {
        continue;
      }
      const trainedPokemon = await this.trainedPokemonRepository.findById(status.trainedPokemonId);
      const abilityName = trainedPokemon?.ability?.name;
      if (abilityName && AbilityRegistry.get(abilityName)?.primalWeather === global.primalWeather) {
        await this.battleRepository.patchGlobalFieldState(battleId, {
          weatherSourceStatusId: status.id,
        });
        return;
      }
    }
    await this.battleRepository.update(battleId, { weather: Weather.None });
    await this.battleRepository.patchGlobalFieldState(battleId, {
      primalWeather: null,
      weatherSourceStatusId: null,
    });
  }
}
