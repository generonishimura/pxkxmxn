import { Battle, Field, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { getGlobalFieldState } from '../../domain/state/side-state';
import { isGrounded } from '../../domain/logic/grounded';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { applyHeal, fractionOfMaxHp } from '@/modules/pokemon/domain/battle-events/heal';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #103 #110 #114 #119 #135 一部）
import { resolveBattlePokemonTraits } from '@/modules/pokemon/domain/battle-events/battle-traits';

/**
 * FieldResidualProcessor
 * ターン終了時の、天候とフィールドの終わりと、グラスフィールドの回復を処理する
 * StatusConditionProcessorService.processTurnEndAbilities が、本家の residual の順に近い順で呼ぶ
 *
 * - endExpiringWeather: weatherTurns が 1 の天候を、ほかのターン終了時の処理より先に終わらせる
 *   （本家の天候は residual の初めに duration を減らして終わるので、最後のターンはすなあらしのダメージを受けない）
 * - applyGrassyTerrainHeal: グラスフィールドで、地面にいて隠れていないポケモンを最大 HP の 1/16 回復する
 * - endExpiringTerrain: terrainTurns が 1 のフィールドを、ほかのターン終了時の処理のあとで終わらせる
 *   （本家のフィールドは residual の終わりのほうで終わるので、最後のターンもグラスフィールドで回復する）
 *
 * ゲンシ天候（primalWeather）は残りターン数を持たないので、ここでは終わらない（出したポケモンが場を離れたら終わる）
 */
export class FieldResidualProcessor {
  constructor(
    private readonly battleRepository: IBattleRepository,
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * 残りが 1 の天候を終わらせる（Battle.weather を None にし、weatherTurns を消す）
   * @returns 書き込んだあとのバトル（終わらなければ、渡したバトル）
   */
  async endExpiringWeather(battle: Battle): Promise<Battle> {
    const global = getGlobalFieldState(battle.sideState);
    if (global.weatherTurns !== 1 || global.primalWeather !== undefined) {
      return battle;
    }
    await this.battleRepository.update(battle.id, { weather: Weather.None });
    return this.battleRepository.patchGlobalFieldState(battle.id, { weatherTurns: null });
  }

  /**
   * 残りが 1 のフィールドを終わらせる（Battle.field を None にし、terrainTurns を消す）
   */
  async endExpiringTerrain(battle: Battle): Promise<void> {
    const latest = (await this.battleRepository.findById(battle.id)) ?? battle;
    if (getGlobalFieldState(latest.sideState).terrainTurns !== 1) {
      return;
    }
    await this.battleRepository.update(latest.id, { field: Field.None });
    await this.battleRepository.patchGlobalFieldState(latest.id, { terrainTurns: null });
  }

  /**
   * グラスフィールド: 地面にいて隠れていない場のポケモンを、最大 HP の 1/16（切り捨て、最低 1）回復する
   * 回復は applyHeal（かいふくふうじ中は回復しない）
   */
  async applyGrassyTerrainHeal(
    battle: Battle,
    activePokemon: readonly BattlePokemonStatus[],
    battleContext: BattleContext,
  ): Promise<void> {
    if (battle.field !== Field.GrassyTerrain) {
      return;
    }
    for (const status of activePokemon) {
      const latest = (await this.battleRepository.findBattlePokemonStatusById(status.id)) ?? status;
      if (latest.isFainted() || latest.volatileState.semiInvulnerable !== undefined) {
        continue;
      }
      // 実効のタイプと特性（みずびたし・はねやすめ・いえきなどを反映）
      const traits = await resolveBattlePokemonTraits(latest, battleContext);
      const grounded = isGrounded({
        typeNames: traits?.typeNames ?? [],
        abilityName: traits?.abilityName,
        volatileState: latest.volatileState,
        sideState: battle.sideState,
      });
      if (grounded) {
        await applyHeal(latest, fractionOfMaxHp(latest, 16), battleContext);
      }
    }
  }
}
