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
  // もうどく・ねむりのターン数を追跡（バトルID -> バトルポケモンステータスID -> ターン数）
  private badPoisonTurnCounts: Map<number, Map<number, number>> = new Map();
  private sleepTurnCounts: Map<number, Map<number, number>> = new Map();

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TYPE_EFFECTIVENESS_REPOSITORY_TOKEN)
    private readonly typeEffectivenessRepository: ITypeEffectivenessRepository,
  ) {}

  /**
   * ターンを実行
   */
  async execute(params: ExecuteTurnParams): Promise<ExecuteTurnResult> {
    const battle = await this.battleRepository.findById(params.battleId);
    if (!battle) {
      throw new Error('Battle not found');
    }

    if (battle.status !== 'Active') {
      throw new Error('Battle is not active');
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
      throw new Error('Active pokemon not found');
    }

    // 行動順を決定
    const actions = await this.determineActionOrder(
      battle,
      params.trainer1Action,
      params.trainer2Action,
      trainer1Active,
      trainer2Active,
    );

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
            const statusMessage = this.getStatusConditionMessage(attacker.statusCondition);
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
        const winner = await this.checkWinner(battle.id);
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
    await this.processTurnEndAbilities(battle);

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
   * 行動順を決定
   * 優先度と速度を考慮して決定
   * 優先順位: 交代 > 優先度 > 速度 > 状態異常補正
   */
  private async determineActionOrder(
    battle: Battle,
    trainer1Action: ExecuteTurnParams['trainer1Action'],
    trainer2Action: ExecuteTurnParams['trainer2Action'],
    trainer1Active: BattlePokemonStatus,
    trainer2Active: BattlePokemonStatus,
  ): Promise<
    Array<{
      trainerId: number;
      action: 'move' | 'switch';
      moveId?: number;
      switchPokemonId?: number;
    }>
  > {
    const actions: Array<{
      trainerId: number;
      action: 'move' | 'switch';
      moveId?: number;
      switchPokemonId?: number;
    }> = [];

    // ポケモン交代は常に先に実行
    if (trainer1Action.switchPokemonId) {
      actions.push({
        trainerId: trainer1Action.trainerId,
        action: 'switch',
        switchPokemonId: trainer1Action.switchPokemonId,
      });
    }
    if (trainer2Action.switchPokemonId) {
      actions.push({
        trainerId: trainer2Action.trainerId,
        action: 'switch',
        switchPokemonId: trainer2Action.switchPokemonId,
      });
    }

    // 両方が技を使用する場合、優先度と速度を考慮
    if (trainer1Action.moveId && trainer2Action.moveId) {
      // 技の優先度を取得
      const trainer1Move = await this.moveRepository.findById(trainer1Action.moveId);
      const trainer2Move = await this.moveRepository.findById(trainer2Action.moveId);

      if (!trainer1Move || !trainer2Move) {
        throw new Error('Move not found');
      }

      // 特性による優先度補正を適用
      const trainer1TrainedPokemon = await this.trainedPokemonRepository.findById(
        trainer1Active.trainedPokemonId,
      );
      const trainer2TrainedPokemon = await this.trainedPokemonRepository.findById(
        trainer2Active.trainedPokemonId,
      );

      const battleContext = {
        battle,
        weather: battle.weather,
        field: battle.field,
      };

      let trainer1Priority = trainer1Move.priority;
      let trainer2Priority = trainer2Move.priority;

      if (trainer1TrainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainer1TrainedPokemon.ability.name);
        if (abilityEffect?.modifyPriority) {
          const modifiedPriority = abilityEffect.modifyPriority(
            trainer1Active,
            trainer1Move.priority,
            battleContext,
          );
          if (modifiedPriority !== undefined) {
            trainer1Priority = modifiedPriority;
          }
        }
      }

      if (trainer2TrainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainer2TrainedPokemon.ability.name);
        if (abilityEffect?.modifyPriority) {
          const modifiedPriority = abilityEffect.modifyPriority(
            trainer2Active,
            trainer2Move.priority,
            battleContext,
          );
          if (modifiedPriority !== undefined) {
            trainer2Priority = modifiedPriority;
          }
        }
      }

      // 優先度が異なる場合は優先度が高い方が先
      if (trainer1Priority !== trainer2Priority) {
        if (trainer1Priority > trainer2Priority) {
          actions.push({
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          });
          actions.push({
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          });
        } else {
          actions.push({
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          });
          actions.push({
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          });
        }
      } else {
        // 優先度が同じ場合は速度で判定
        // 状態異常による素早さ補正を考慮
        let trainer1Speed = await this.getEffectiveSpeed(trainer1Active);
        let trainer2Speed = await this.getEffectiveSpeed(trainer2Active);

        // まひ状態異常の場合は素早さが0.5倍
        const trainer1SpeedMultiplier =
          trainer1Active.statusCondition === StatusCondition.Paralysis ? 0.5 : 1.0;
        const trainer2SpeedMultiplier =
          trainer2Active.statusCondition === StatusCondition.Paralysis ? 0.5 : 1.0;

        trainer1Speed = trainer1Speed * trainer1SpeedMultiplier;
        trainer2Speed = trainer2Speed * trainer2SpeedMultiplier;

        // 特性による速度補正を適用
        if (trainer1TrainedPokemon?.ability) {
          const abilityEffect = AbilityRegistry.get(trainer1TrainedPokemon.ability.name);
          if (abilityEffect?.modifySpeed) {
            const modifiedSpeed = abilityEffect.modifySpeed(
              trainer1Active,
              trainer1Speed,
              battleContext,
            );
            if (modifiedSpeed !== undefined) {
              trainer1Speed = modifiedSpeed;
            }
          }
        }

        if (trainer2TrainedPokemon?.ability) {
          const abilityEffect = AbilityRegistry.get(trainer2TrainedPokemon.ability.name);
          if (abilityEffect?.modifySpeed) {
            const modifiedSpeed = abilityEffect.modifySpeed(
              trainer2Active,
              trainer2Speed,
              battleContext,
            );
            if (modifiedSpeed !== undefined) {
              trainer2Speed = modifiedSpeed;
            }
          }
        }

        // 速度比較
        if (trainer1Speed >= trainer2Speed) {
          actions.push({
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          });
          actions.push({
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          });
        } else {
          actions.push({
            trainerId: trainer2Action.trainerId,
            action: 'move',
            moveId: trainer2Action.moveId,
          });
          actions.push({
            trainerId: trainer1Action.trainerId,
            action: 'move',
            moveId: trainer1Action.moveId,
          });
        }
      }
    } else if (trainer1Action.moveId) {
      actions.push({
        trainerId: trainer1Action.trainerId,
        action: 'move',
        moveId: trainer1Action.moveId,
      });
    } else if (trainer2Action.moveId) {
      actions.push({
        trainerId: trainer2Action.trainerId,
        action: 'move',
        moveId: trainer2Action.moveId,
      });
    }

    return actions;
  }

  /**
   * ランク補正を考慮した実効速度を取得
   */
  private async getEffectiveSpeed(status: BattlePokemonStatus): Promise<number> {
    // TrainedPokemon情報を取得
    const trainedPokemon = await this.trainedPokemonRepository.findById(status.trainedPokemonId);

    if (!trainedPokemon) {
      throw new Error('TrainedPokemon not found');
    }

    // ステータスを計算
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

    // ランク補正を適用
    const multiplier = status.getStatMultiplier('speed');
    return Math.floor(stats.speed * multiplier);
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
      throw new Error('Move not found');
    }

    // 攻撃側と防御側のポケモン情報を取得
    const attackerTrainedPokemon = await this.trainedPokemonRepository.findById(
      attacker.trainedPokemonId,
    );
    const defenderTrainedPokemon = await this.trainedPokemonRepository.findById(
      defender.trainedPokemonId,
    );

    if (!attackerTrainedPokemon || !defenderTrainedPokemon) {
      throw new Error('TrainedPokemon not found');
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
      throw new Error('Defender not found after damage application');
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
      throw new Error(
        `BattlePokemonMove not found. 技ID: ${battlePokemonMoveId} が見つかりませんでした`,
      );
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

      // もうどく・ねむりのターン数をリセット
      if (this.badPoisonTurnCounts.has(battle.id)) {
        this.badPoisonTurnCounts.get(battle.id)!.delete(currentActive.id);
      }
      if (this.sleepTurnCounts.has(battle.id)) {
        this.sleepTurnCounts.get(battle.id)!.delete(currentActive.id);
      }
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
   * ターン終了時の特性効果と状態異常を処理
   */
  private async processTurnEndAbilities(battle: Battle): Promise<void> {
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const activePokemon = battleStatuses.filter(s => s.isActive);

    for (const status of activePokemon) {
      // 状態異常によるダメージ処理
      await this.processStatusConditionDamage(battle.id, status);

      // 特性効果の処理
      const trainedPokemon = await this.trainedPokemonRepository.findById(status.trainedPokemonId);

      if (trainedPokemon?.ability) {
        const abilityEffect = AbilityRegistry.get(trainedPokemon.ability.name);
        if (abilityEffect?.onTurnEnd) {
          await abilityEffect.onTurnEnd(status, {
            battle,
            battleRepository: this.battleRepository,
          });
        }
      }
    }
  }

  /**
   * 状態異常によるダメージを処理
   */
  private async processStatusConditionDamage(
    battleId: number,
    status: BattlePokemonStatus,
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

      // ねむりの自動解除判定
      if (StatusConditionHandler.shouldClearSleep(sleepTurnCount)) {
        await this.battleRepository.updateBattlePokemonStatus(status.id, {
          statusCondition: StatusCondition.None,
        });
        battleMap.delete(status.id);
        return;
      }

      battleMap.set(status.id, sleepTurnCount + 1);
    }

    // ダメージを計算
    const damage = StatusConditionHandler.calculateTurnEndDamage(status, badPoisonTurnCount);
    if (damage > 0) {
      const newHp = Math.max(0, status.currentHp - damage);
      await this.battleRepository.updateBattlePokemonStatus(status.id, {
        currentHp: newHp,
      });
    }
  }

  /**
   * 状態異常のメッセージを取得
   */
  private getStatusConditionMessage(statusCondition: StatusCondition | null): string {
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
    };

    return messages[statusCondition] || 'unknown status';
  }

  /**
   * 勝敗を判定
   */
  private async checkWinner(battleId: number): Promise<number | null> {
    const battle = await this.battleRepository.findById(battleId);
    if (!battle) {
      return null;
    }

    // 各トレーナーのアクティブなポケモンを取得
    const trainer1Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battleId,
      battle.trainer1Id,
    );
    const trainer2Active = await this.battleRepository.findActivePokemonByBattleIdAndTrainerId(
      battleId,
      battle.trainer2Id,
    );

    // 両方のポケモンが倒れている場合（理論上は発生しない）
    if (!trainer1Active && !trainer2Active) {
      return null;
    }

    // トレーナー1のポケモンが倒れている場合
    if (!trainer1Active || trainer1Active.isFainted()) {
      // トレーナー1の他のポケモンがいるか確認
      const trainer1Statuses =
        await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
      const trainer1Alive = trainer1Statuses.filter(
        s => s.trainerId === battle.trainer1Id && !s.isFainted(),
      );

      if (trainer1Alive.length === 0) {
        return battle.trainer2Id;
      }
    }

    // トレーナー2のポケモンが倒れている場合
    if (!trainer2Active || trainer2Active.isFainted()) {
      // トレーナー2の他のポケモンがいるか確認
      const trainer2Statuses =
        await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
      const trainer2Alive = trainer2Statuses.filter(
        s => s.trainerId === battle.trainer2Id && !s.isFainted(),
      );

      if (trainer2Alive.length === 0) {
        return battle.trainer1Id;
      }
    }

    return null;
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
