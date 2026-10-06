import { Injectable, Inject } from '@nestjs/common';
import { Battle } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { IAbilityEffect } from '@/modules/pokemon/domain/abilities/ability-effect.interface';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { resolveEffectiveWeather } from '../../domain/logic/effective-weather';
import { isEmptyObject } from '../../domain/state/state-field-parser';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';
import { VolatileResidualProcessor } from './volatile-residual-processor';

/**
 * StatusConditionProcessorService
 * 状態異常とターン終了時の特性効果を処理するサービス
 */
@Injectable()
export class StatusConditionProcessorService {
  // もうどく・ねむりのターン数を追跡（バトルID -> バトルポケモンステータスID -> ターン数）
  // こんらん・ひるみは volatileState にある（confusionTurns は技を出そうとするたびに減り、flinched はターン終了時に消える）
  private badPoisonTurnCounts: Map<number, Map<number, number>> = new Map();
  private sleepTurnCounts: Map<number, Map<number, number>> = new Map();

  private readonly volatileResiduals: VolatileResidualProcessor;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {
    this.volatileResiduals = new VolatileResidualProcessor(
      battleRepository,
      trainedPokemonRepository,
    );
  }

  /**
   * ターン終了時の特性効果と状態異常を処理
   *
   * 1. すなあらしのダメージ（場の全員）
   * 2. ねがいごと（陣営）
   * 3. 場のポケモンごとに: アクアリング・ねをはる・やどりぎのタネ → 状態異常（ねむりの解除・どく・やけど）→
   *    あくむ・のろい・バインド・しおづけ・たこがため・あくび・ほろびのうた → 特性の onTurnEnd
   */
  async processTurnEndAbilities(battle: Battle): Promise<void> {
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const activePokemon = battleStatuses.filter(s => s.isActive);

    // 場の特性を考慮した天候（ノーてんき・エアロックが場にいれば天候なし）
    // ひんしのポケモンの特性は天候を消さない（本家の suppressingWeather と同じ）
    const activeAbilityNames = await Promise.all(
      activePokemon
        .filter(status => !status.isFainted())
        .map(async status => {
          const trainedPokemon = await this.trainedPokemonRepository.findById(
            status.trainedPokemonId,
          );
          return trainedPokemon?.ability?.name;
        }),
    );
    const weather = resolveEffectiveWeather(battle.weather, activeAbilityNames);
    const fieldContext: BattleContext = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
      weather,
      field: battle.field,
    };
    await this.volatileResiduals.applyWeatherDamage(activePokemon, weather, fieldContext);
    await this.volatileResiduals.applyWish(battle, fieldContext);

    for (const status of activePokemon) {
      const trainedPokemon = await this.trainedPokemonRepository.findById(status.trainedPokemonId);
      const abilityEffect = trainedPokemon?.ability
        ? AbilityRegistry.get(trainedPokemon.ability.name)
        : undefined;
      const battleContext: BattleContext = {
        battle,
        battleRepository: this.battleRepository,
        trainedPokemonRepository: this.trainedPokemonRepository,
        weather,
        field: battle.field,
      };

      // 状態異常のダメージより前の一時的な状態（アクアリング・ねをはる・やどりぎのタネ）
      const opponent = activePokemon.find(other => other.trainerId !== status.trainerId);
      if (!isEmptyObject(status.volatileState)) {
        await this.volatileResiduals.applyBeforeStatusDamage(status, opponent, battleContext);
      }

      // 状態異常によるダメージ処理（天候・ねがいごと・一時的な状態で HP が変わるので、読み直したものを使う）
      const beforeStatusDamage =
        (await this.battleRepository.findBattlePokemonStatusById(status.id)) ?? status;
      if (beforeStatusDamage.isFainted()) {
        continue;
      }
      await this.processStatusConditionDamage(
        battle.id,
        beforeStatusDamage,
        battleContext,
        abilityEffect,
      );

      // 状態異常のダメージよりあとの一時的な状態（あくむ・のろい・バインド・しおづけ・たこがため・あくび・ほろびのうた）
      if (!isEmptyObject(status.volatileState)) {
        await this.volatileResiduals.applyAfterStatusDamage(status, battleContext);
      }

      // 状態異常ダメージを反映した最新のステータスを読み直す
      // 古いステータスのまま特性が HP を書くと、状態異常ダメージが上書きされてしまうため
      const latestStatus = await this.battleRepository.findBattlePokemonStatusById(status.id);
      if (!latestStatus || latestStatus.isFainted()) {
        continue;
      }

      // 特性効果の処理
      if (abilityEffect?.onTurnEnd) {
        await abilityEffect.onTurnEnd(latestStatus, battleContext);
      }
    }
  }

  /**
   * 状態異常によるダメージを処理
   */
  private async processStatusConditionDamage(
    battleId: number,
    status: BattlePokemonStatus,
    battleContext: BattleContext,
    abilityEffect: IAbilityEffect | undefined,
  ): Promise<void> {
    // ねむっていなければ、ねむりのターン数を捨てる（さわぐ・めざましビンタなどで起きたあと、次のねむりを 0 から数える）
    if (status.statusCondition !== StatusCondition.Sleep) {
      this.sleepTurnCounts.get(battleId)?.delete(status.id);
    }
    if (!status.statusCondition || status.statusCondition === StatusCondition.None) {
      return;
    }

    // もうどくのターン数を取得・更新
    let badPoisonTurnCount = 0;
    if (status.statusCondition === StatusCondition.BadPoison) {
      if (!this.badPoisonTurnCounts.has(battleId)) {
        this.badPoisonTurnCounts.set(battleId, new Map());
      }
      const battleMap = this.badPoisonTurnCounts.get(battleId)!;
      badPoisonTurnCount = battleMap.get(status.id) || 0;
      battleMap.set(status.id, badPoisonTurnCount + 1);
    }

    // ねむりのターン数を取得・更新
    let sleepTurnCount = 0;
    if (status.statusCondition === StatusCondition.Sleep) {
      if (!this.sleepTurnCounts.has(battleId)) {
        this.sleepTurnCounts.set(battleId, new Map());
      }
      const battleMap = this.sleepTurnCounts.get(battleId)!;
      sleepTurnCount = battleMap.get(status.id) || 0;

      // ねむりの自動解除判定（はやおきなどは1ターンに2ターン分進む）
      const sleepStep = abilityEffect?.sleepTurnMultiplier ?? 1;
      if (StatusConditionHandler.shouldClearSleep(sleepTurnCount, sleepStep)) {
        await this.battleRepository.updateBattlePokemonStatus(status.id, {
          statusCondition: StatusCondition.None,
        });
        battleMap.delete(status.id);
        return;
      }

      battleMap.set(status.id, sleepTurnCount + sleepStep);
    }

    // ダメージを計算（ポイズンヒールなどの特性で変える。マジックガードなら減らさない）
    const baseDamage = StatusConditionHandler.calculateTurnEndDamage(status, badPoisonTurnCount);
    if (baseDamage <= 0) {
      return;
    }
    const damage =
      (await abilityEffect?.modifyStatusDamage?.(
        status,
        status.statusCondition,
        baseDamage,
        battleContext,
      )) ?? baseDamage;
    const latestStatus = abilityEffect?.modifyStatusDamage
      ? ((await this.battleRepository.findBattlePokemonStatusById(status.id)) ?? status)
      : status;
    await applyIndirectDamage(latestStatus, damage, battleContext);
  }

  /**
   * 状態異常のメッセージを取得
   */
  getStatusConditionMessage(statusCondition: StatusCondition | null): string {
    if (!statusCondition) {
      return 'no status';
    }

    const messages: Record<StatusCondition, string> = {
      [StatusCondition.None]: 'no status',
      [StatusCondition.Burn]: 'burn',
      [StatusCondition.Freeze]: 'freeze',
      [StatusCondition.Paralysis]: 'paralysis',
      [StatusCondition.Poison]: 'poison',
      [StatusCondition.BadPoison]: 'bad poison',
      [StatusCondition.Sleep]: 'sleep',
      [StatusCondition.Flinch]: 'flinch',
      [StatusCondition.Confusion]: 'confusion',
    };

    return messages[statusCondition] || 'unknown status';
  }
}
