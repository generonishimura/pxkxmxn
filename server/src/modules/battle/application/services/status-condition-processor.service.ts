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
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { applyIndirectDamage } from '@/modules/pokemon/domain/battle-events/indirect-damage';

/**
 * StatusConditionProcessorService
 * 状態異常とターン終了時の特性効果を処理するサービス
 */
@Injectable()
export class StatusConditionProcessorService {
  // もうどく・ねむり・こんらんのターン数を追跡（バトルID -> バトルポケモンステータスID -> ターン数）
  private badPoisonTurnCounts: Map<number, Map<number, number>> = new Map();
  private sleepTurnCounts: Map<number, Map<number, number>> = new Map();
  private confusionTurnCounts: Map<number, Map<number, number>> = new Map();

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
  ) {}

  /**
   * ターン終了時の特性効果と状態異常を処理
   */
  async processTurnEndAbilities(battle: Battle): Promise<void> {
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const activePokemon = battleStatuses.filter(s => s.isActive);

    // 場の特性を考慮した天候（ノーてんき・エアロックが場にいれば天候なし）
    const activeAbilityNames = await Promise.all(
      activePokemon.map(async status => {
        const trainedPokemon = await this.trainedPokemonRepository.findById(
          status.trainedPokemonId,
        );
        return trainedPokemon?.ability?.name;
      }),
    );
    const weather = resolveEffectiveWeather(battle.weather, activeAbilityNames);

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

      // 状態異常によるダメージ処理
      await this.processStatusConditionDamage(battle.id, status, battleContext, abilityEffect);

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

    // ひるみの自動解除（ターン終了時に必ず解除、ねむりと同様のパターンで早期リターン）
    if (status.statusCondition === StatusCondition.Flinch) {
      await this.battleRepository.updateBattlePokemonStatus(status.id, {
        statusCondition: StatusCondition.None,
      });
      return; // 早期リターンにより後続のダメージ計算をスキップ
    }

    // こんらんのターン数を取得・更新
    let confusionTurnCount = 0;
    if (status.statusCondition === StatusCondition.Confusion) {
      if (!this.confusionTurnCounts.has(battleId)) {
        this.confusionTurnCounts.set(battleId, new Map());
      }
      const battleMap = this.confusionTurnCounts.get(battleId)!;
      confusionTurnCount = battleMap.get(status.id) || 0;

      // こんらんの自動解除判定
      if (StatusConditionHandler.shouldClearConfusion(confusionTurnCount)) {
        await this.battleRepository.updateBattlePokemonStatus(status.id, {
          statusCondition: StatusCondition.None,
        });
        battleMap.delete(status.id);
        return; // 早期リターンにより後続のダメージ計算をスキップ
      }

      battleMap.set(status.id, confusionTurnCount + 1);
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
