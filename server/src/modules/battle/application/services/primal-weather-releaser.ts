import { Weather } from '../../domain/entities/battle.entity';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { getGlobalFieldState } from '../../domain/state/side-state';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #119 #135 一部）
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { resolveBattlePokemonTraits } from '@/modules/pokemon/domain/battle-events/battle-traits';

/**
 * PrimalWeatherReleaser
 * ゲンシ天候を出したポケモンが場を離れたとき（交代・ひんし）に、天候を終わらせる
 * PokemonSwitcherService（交代・設置技でのひんし）と ExecuteTurnUseCase（技・ターン終了時のひんし）が呼ぶ
 *
 * 本家の primordialsea などの onEnd と同じく、場に同じゲンシ天候の特性（IAbilityEffect.primalWeather）の
 * ポケモンが残っていれば、そのポケモンに引き継ぐ。いなければ Battle.weather を None にし、
 * primalWeather と weatherSourceStatusId を消す
 * 特性を書き換えられた・消された（スキルスワップ・いえき・かがくへんかガス）ときも、場を離れたときと同じに扱う
 * （本家の onEnd は特性が終わったときに呼ばれる。releaseIfAbilityLost）
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
      if (await this.holdsPrimalWeather(status, global.primalWeather)) {
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

  /**
   * ゲンシ天候を出したポケモンが場にいても、実効の特性がそのゲンシ天候の特性でなくなっていたら、場を離れたときと同じに
   * 終わらせる（同じ特性のポケモンが場にいれば引き継ぐ）。ExecuteTurnUseCase が行動のたびに呼ぶ
   */
  async releaseIfAbilityLost(battleId: number): Promise<void> {
    const battle = await this.battleRepository.findById(battleId);
    if (!battle) {
      return;
    }
    const global = getGlobalFieldState(battle.sideState);
    if (global.primalWeather === undefined || global.weatherSourceStatusId === undefined) {
      return;
    }
    const source = await this.battleRepository.findBattlePokemonStatusById(
      global.weatherSourceStatusId,
    );
    if (
      !source ||
      !source.isActive ||
      source.isFainted() ||
      (await this.holdsPrimalWeather(source, global.primalWeather))
    ) {
      return;
    }
    await this.release(battleId, source.id);
  }

  /**
   * 実効の特性が、そのゲンシ天候の特性か（いえき・かがくへんかガス・特性の上書きを反映）
   */
  private async holdsPrimalWeather(
    status: BattlePokemonStatus,
    primalWeather: string,
  ): Promise<boolean> {
    const traits = await resolveBattlePokemonTraits(status, {
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    });
    const abilityName = traits?.abilityName;
    return (
      abilityName !== undefined && AbilityRegistry.get(abilityName)?.primalWeather === primalWeather
    );
  }
}
