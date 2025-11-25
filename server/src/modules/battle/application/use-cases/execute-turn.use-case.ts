import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { DamageCalculator, MoveInfo } from '../../domain/logic/damage-calculator';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { AccuracyCalculator } from '../../domain/logic/accuracy-calculator';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { StatusConditionHandler } from '../../domain/logic/status-condition-handler';
import { MoveRegistry } from '@/modules/pokemon/domain/moves/move-registry';
import {
  NotFoundException,
  InvalidStateException,
} from '@/shared/domain/exceptions';
import { ActionOrderDeterminerService } from '../services/action-order-determiner.service';
import { WinnerCheckerService } from '../services/winner-checker.service';
import { StatusConditionProcessorService } from '../services/status-condition-processor.service';

/**
 * ターン実行の入力パラメータ
 */
export interface ExecuteTurnParams {
  battleId: number;
  trainer1Action: {
    trainerId: number;
    moveId?: number; // 技を使用する場合
    switchPokemonId?: number; // ポケモンを交代する場合
  };
  trainer2Action: {
    trainerId: number;
    moveId?: number; // 技を使用する場合
    switchPokemonId?: number; // ポケモンを交代する場合
  };
}

/**
 * ターン実行の結果
 */
export interface ExecuteTurnResult {
  battle: Battle;
  actions: Array<{
    trainerId: number;
    action: string; // 'move' | 'switch'
    result: string; // 行動結果の説明
  }>;
  winnerTrainerId?: number; // 勝者が決まった場合
}

/**
 * ExecuteTurnUseCase
 * ターン処理のロジックを実行するユースケース
 *
 * 処理内容:
 * 1. 行動順の決定（速度と優先度を考慮）
 * 2. 行動の実行（技の実行またはポケモン交代）
 * 3. ダメージ計算
 * 4. 特性効果の処理
 * 5. 勝敗判定
 */
@Injectable()
export class ExecuteTurnUseCase {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN)
    private readonly typeEffectivenessRepository: ITypeEffectivenessRepository,
    private readonly actionOrderDeterminer: ActionOrderDeterminerService,
    private readonly winnerChecker: WinnerCheckerService,
    private readonly statusConditionProcessor: StatusConditionProcessorService,
  ) {}

  /**
   * ターンを実行
   */
  async execute(params: ExecuteTurnParams): Promise<ExecuteTurnResult> {
    const battle = await this.battleRepository.findById(params.battleId);
    if (!battle) {
      throw new NotFoundException('Battle', params.battleId);
    }

    if (battle.status !== 'Active') {
      throw new InvalidStateException(
        `Battle is not active. Current status: ${battle.status}`,
        battle.status,
      );
    }

    // アクティブなポケモンを取得
    const trainer1Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      params.trainer1Action.trainerId,
    );
    const trainer2Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      params.trainer2Action.trainerId,
    );

    if (!trainer1Active || !trainer2Active) {
      throw new NotFoundException('Active pokemon');
    }

    // 行動順を決定
    const actions = await this.actionOrderDeterminer.determine({
      battle,
      trainer1Action: params.trainer1Action,
      trainer2Action: params.trainer2Action,
      trainer1Active,
      trainer2Active,
    });

    const actionResults: Array<{ trainerId: number; action: string; result: string }> = [];

    // 行動を順番に実行
    for (const action of actions) {
      if (action.action === 'move' && action.moveId) {
        const attacker =
          action.trainerId === params.trainer1Action.trainerId ? trainer1Active : trainer2Active;
        const defender =
          action.trainerId === params.trainer1Action.trainerId ? trainer2Active : trainer1Active;

        // PPチェック(PPが0の場合は使用不可)
        const battlePokemonMoves =
          await this.battleRepository.findBattlePokemonMovesByBattlePokemonStatusId(attacker.id);
        const battlePokemonMove = battlePokemonMoves.find(bpm => bpm.moveId === action.moveId);
        if (!battlePokemonMove) {
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result: `Move not found in battle pokemon moves (moveId: ${action.moveId}, battlePokemonStatusId: ${attacker.id})`,
          });
          continue;
        }
        if (battlePokemonMove.isPpExhausted()) {
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result: 'Move has no PP left',
          });
          continue;
        }

        // 状態異常による行動不能判定
        if (!StatusConditionHandler.canAct(attacker)) {
          // こおりの場合は解除判定を行う
          if (
            attacker.statusCondition === StatusCondition.Freeze &&
            StatusConditionHandler.shouldClearFreeze()
          ) {
            await this.battleRepository.updateBattlePokemonStatus(attacker.id, {
              statusCondition: StatusCondition.None,
            });
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result: 'Pokemon thawed out and can act',
            });
            // 解除されたので行動を続行
            const result = await this.executeMove(
              battle,
              action.trainerId,
              action.moveId,
              attacker,
              defender,
              battlePokemonMove.id,
            );
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result,
            });
          } else {
            // 行動不能
            const statusMessage = this.statusConditionProcessor.getStatusConditionMessage(
              attacker.statusCondition,
            );
            actionResults.push({
              trainerId: action.trainerId,
              action: 'move',
              result: `Cannot act due to ${statusMessage}`,
            });
          }
        } else {
          const result = await this.executeMove(
            battle,
            action.trainerId,
            action.moveId,
            attacker,
            defender,
            battlePokemonMove.id,
          );
          actionResults.push({
            trainerId: action.trainerId,
            action: 'move',
            result,
          });
        }

        // 勝敗判定
        const winner = await this.winnerChecker.checkWinner(battle.id);
        if (winner) {
          await this.battleRepository.update(battle.id, {
            status: BattleStatus.Completed,
            winnerTrainerId: winner,
          });
          return {
            battle: (await this.battleRepository.findById(battle.id)) as Battle,
            actions: actionResults,
            winnerTrainerId: winner,
          };
        }
      } else if (action.action === 'switch' && action.switchPokemonId) {
        await this.executeSwitch(battle, action.trainerId, action.switchPokemonId);
        actionResults.push({
          trainerId: action.trainerId,
          action: 'switch',
          result: `Pokemon switched to ID: ${action.switchPokemonId}`,
        });
      }
    }

    // ターン終了時の特性効果を処理
    await this.statusConditionProcessor.processTurnEndAbilities(battle);

    // ターン数を増やす
    const updatedBattle = await this.battleRepository.update(battle.id, {
      turn: battle.turn + 1,
    });

    return {
      battle: updatedBattle,
      actions: actionResults,
    };
  }


  /**
   * 技を実行
   */
  private async executeMove(
    battle: Battle,
    attackerTrainerId: number,
    moveId: number,
    attacker: BattlePokemonStatus,
    defender: BattlePokemonStatus,
    battlePokemonMoveId: number,
  ): Promise<string> {
    // 技情報を取得
    const move = await this.moveRepository.findById(moveId);

    if (!move) {
      throw new NotFoundException('Move', moveId);
    }

    // 攻撃側と防御側のポケモン情報を取得
    const attackerTrainedPokemon = await this.trainedPokemonRepository.findById(
      attacker.trainedPokemonId,
    );
    const defenderTrainedPokemon = await this.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );

    if (!attackerTrainedPokemon || !defenderTrainedPokemon) {
      const missingId = !attackerTrainedPokemon
        ? attacker.trainedPokemonId
        : defender.trainedPokemonId;
      throw new NotFoundException('TrainedPokemon', missingId);
    }

    // バトルコンテキストを作成（技の特殊効果用）
    const battleContext = {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
      weather: battle.weather,
      field: battle.field,
    };

    // 命中率判定（変化技の場合は常に命中とみなす）
    if (move.category !== 'Status' && move.power !== null) {
      const hit = AccuracyCalculator.checkHit(
        move.accuracy,
        attacker,
        defender,
        attackerTrainedPokemon.ability?.name,
        defenderTrainedPokemon.ability?.name,
        battleContext,
      );

      if (!hit) {
        // 外れた場合でもPPは消費される
        await this.consumePp(battlePokemonMoveId);

        // 技の特殊効果（onMiss）を呼び出す
        const moveEffect = MoveRegistry.get(move.name);
        if (moveEffect?.onMiss) {
          const missMessage = await moveEffect.onMiss(attacker, defender, battleContext);
          if (missMessage) {
            return `Used ${move.name} but it missed. ${missMessage}`;
          }
        }

        return `Used ${move.name} but it missed`;
      }
    }

    // 変化技の場合はダメージなし(PPは消費される)
    if (move.category === 'Status' || move.power === null) {
      await this.consumePp(battlePokemonMoveId);
      return `Used ${move.name} (Status move)`;
    }

    // タイプ相性を取得
    const typeEffectiveness = await this.typeEffectivenessRepository.getTypeEffectivenessMap();

    // 実際のステータス値を計算
    const attackerStats = this.calculateStats(attackerTrainedPokemon);
    const defenderStats = this.calculateStats(defenderTrainedPokemon);

    // ダメージを計算
    const moveInfo: MoveInfo = {
      power: move.power,
      typeId: move.type.id,
      category: this.convertMoveCategoryToString(move.category),
      accuracy: move.accuracy,
    };

    const damage = DamageCalculator.calculate({
      attacker,
      defender,
      move: moveInfo,
      moveType: move.type,
      attackerTypes: {
        primary: attackerTrainedPokemon.pokemon.primaryType,
        secondary: attackerTrainedPokemon.pokemon.secondaryType,
      },
      defenderTypes: {
        primary: defenderTrainedPokemon.pokemon.primaryType,
        secondary: defenderTrainedPokemon.pokemon.secondaryType,
      },
      typeEffectiveness,
      weather: battle.weather,
      field: battle.field,
      attackerAbilityName: attackerTrainedPokemon.ability?.name,
      defenderAbilityName: defenderTrainedPokemon.ability?.name,
      attackerStats: attackerStats,
      defenderStats: defenderStats,
      battle,
    });

    // ダメージを適用
    const newHp = Math.max(0, defender.currentHp - damage);
    await this.battleRepository.updateBattlePokemonStatus(defender.id, {
      currentHp: newHp,
    });

    // 更新後のdefenderを取得（状態異常付与のために最新の状態を取得）
    const updatedDefender = await this.battleRepository.findBattlePokemonStatusById(defender.id);
    if (!updatedDefender) {
      throw new NotFoundException('Defender BattlePokemonStatus', defender.id);
    }

    // タイプ無効化が発動した場合（ダメージが0の場合）、HP回復などの効果を処理
    if (damage === 0 && defenderTrainedPokemon?.ability) {
      const abilityEffect = AbilityRegistry.get(defenderTrainedPokemon.ability.name);
      if (abilityEffect?.onAfterTakingDamage) {
        const battleContext = {
          battle,
          battleRepository: this.battleRepository,
          trainedPokemonRepository: this.trainedPokemonRepository,
          weather: battle.weather,
          field: battle.field,
          moveTypeName: move.type.name,
        };
        // 元のダメージを計算（タイプ無効化が発動する前のダメージ）
        // 実際には、DamageCalculatorで計算されたダメージが0なので、
        // タイプ無効化が発動したことを示すために、元のダメージを計算する必要はない
        // ただし、HP回復量の計算に使用する可能性があるため、0を渡す
        await abilityEffect.onAfterTakingDamage(updatedDefender, 0, battleContext);
      }
    }

    // PPを消費
    await this.consumePp(battlePokemonMoveId);

    // 技の特殊効果（onHit）を呼び出す
    const moveEffect = MoveRegistry.get(move.name);
    let effectMessage = '';
    if (moveEffect?.onHit) {
      const hitMessage = await moveEffect.onHit(attacker, updatedDefender, battleContext);
      if (hitMessage) {
        effectMessage = ` ${hitMessage}`;
      }
    }

    return `Used ${move.name} and dealt ${damage} damage${effectMessage}`;
  }

  /**
   * PPを消費
   * @param battlePokemonMoveId バトル中のポケモンの技ID
   */
  private async consumePp(battlePokemonMoveId: number): Promise<void> {
    // 現在のBattlePokemonMoveを取得
    const battlePokemonMove =
      await this.battleRepository.findBattlePokemonMoveById(battlePokemonMoveId);

    if (!battlePokemonMove) {
      throw new NotFoundException('BattlePokemonMove', battlePokemonMoveId);
    }

    // PPを1消費
    const newPp = battlePokemonMove.consumePp(1);

    // PPを更新
    await this.battleRepository.updateBattlePokemonMove(battlePokemonMoveId, {
      currentPp: newPp,
    });
  }

  /**
   * ポケモンを交代
   */
  private async executeSwitch(
    battle: Battle,
    trainerId: number,
    trainedPokemonId: number,
  ): Promise<void> {
    // 現在のアクティブなポケモンを非アクティブにする
    const currentActive = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battle.id,
      trainerId,
    );

    if (currentActive) {
      // 状態異常を解除（交代時に解除されるもの）
      const statusCondition = StatusConditionHandler.isClearedOnSwitch(
        currentActive.statusCondition,
      )
        ? StatusCondition.None
        : currentActive.statusCondition;

      await this.battleRepository.updateBattlePokemonStatus(currentActive.id, {
        isActive: false,
        statusCondition,
      });

      // 注: もうどく・ねむりのターン数はStatusConditionProcessorServiceで管理されているため、
      // 状態異常がNoneになれば自動的にクリアされる
    }

    // 新しいポケモンをアクティブにする
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const targetStatus = battleStatuses.find(
      s => s.trainedPokemonId === trainedPokemonId && s.trainerId === trainerId,
    );

    if (targetStatus) {
      await this.battleRepository.updateBattlePokemonStatus(targetStatus.id, {
        isActive: true,
      });

      // 特性のOnEntry効果を発動
      const trainedPokemon = await this.trainedPokemonRepository.findById(trainedPokemonId);

      if (trainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
        if (abilityEffect?.onEntry) {
          await abilityEffect.onEntry(targetStatus, {
            battle,
            battleRepository: this.battleRepository,
          });
        }
      }
    }
  }



  /**
   * TrainedPokemonから実際のステータス値を計算
   */
  private calculateStats(trainedPokemon: TrainedPokemon): {
    attack: number;
    defense: number;
    specialAttack: number;
    specialDefense: number;
    speed: number;
  } {
    const stats = StatCalculator.calculate({
      baseHp: trainedPokemon.pokemon.baseHp,
      baseAttack: trainedPokemon.pokemon.baseAttack,
      baseDefense: trainedPokemon.pokemon.baseDefense,
      baseSpecialAttack: trainedPokemon.pokemon.baseSpecialAttack,
      baseSpecialDefense: trainedPokemon.pokemon.baseSpecialDefense,
      baseSpeed: trainedPokemon.pokemon.baseSpeed,
      level: trainedPokemon.level,
      ivHp: trainedPokemon.ivHp,
      ivAttack: trainedPokemon.ivAttack,
      ivDefense: trainedPokemon.ivDefense,
      ivSpecialAttack: trainedPokemon.ivSpecialAttack,
      ivSpecialDefense: trainedPokemon.ivSpecialDefense,
      ivSpeed: trainedPokemon.ivSpeed,
      evHp: trainedPokemon.evHp,
      evAttack: trainedPokemon.evAttack,
      evDefense: trainedPokemon.evDefense,
      evSpecialAttack: trainedPokemon.evSpecialAttack,
      evSpecialDefense: trainedPokemon.evSpecialDefense,
      evSpeed: trainedPokemon.evSpeed,
      nature: trainedPokemon.nature,
    });

    return {
      attack: stats.attack,
      defense: stats.defense,
      specialAttack: stats.specialAttack,
      specialDefense: stats.specialDefense,
      speed: stats.speed,
    };
  }

  /**
   * MoveCategoryを文字列に変換
   */
  private convertMoveCategoryToString(category: MoveCategory): 'Physical' | 'Special' | 'Status' {
    const categoryMap: Record<MoveCategory, 'Physical' | 'Special' | 'Status'> = {
      [MoveCategory.Physical]: 'Physical',
      [MoveCategory.Special]: 'Special',
      [MoveCategory.Status]: 'Status',
    };
    return categoryMap[category];
  }
}
