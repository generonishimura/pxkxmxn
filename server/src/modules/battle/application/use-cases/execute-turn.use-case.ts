import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITrainedPokemonRepository,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '../../../trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  ITypeEffectivenessRepository,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from '../../../pokemon/domain/pokemon.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { DamageCalculator, MoveInfo } from '../../domain/logic/damage-calculator';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { AbilityRegistry } from '../../../pokemon/domain/abilities/ability-registry';
import { TrainedPokemon } from '../../../trainer/domain/entities/trained-pokemon.entity';
import { MoveCategory } from '../../../pokemon/domain/entities/move.entity';

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
      params.trainer1Action,
      params.trainer2Action,
      trainer1Active,
      trainer2Active,
    );

    const actionResults: Array<{ trainerId: number; action: string; result: string }> = [];

    // 行動を順番に実行
    for (const action of actions) {
      if (action.action === 'move' && action.moveId) {
        const result = await this.executeMove(
          battle,
          action.trainerId,
          action.moveId,
          action.trainerId === params.trainer1Action.trainerId ? trainer1Active : trainer2Active,
          action.trainerId === params.trainer1Action.trainerId ? trainer2Active : trainer1Active,
        );
        actionResults.push({
          trainerId: action.trainerId,
          action: 'move',
          result,
        });

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

      // 優先度が異なる場合は優先度が高い方が先
      if (trainer1Move.priority !== trainer2Move.priority) {
        if (trainer1Move.priority > trainer2Move.priority) {
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
        const trainer1Speed = await this.getEffectiveSpeed(trainer1Active);
        const trainer2Speed = await this.getEffectiveSpeed(trainer2Active);

        // まひ状態異常の場合は素早さが0.5倍
        const trainer1SpeedMultiplier = trainer1Active.statusCondition === StatusCondition.Paralysis ? 0.5 : 1.0;
        const trainer2SpeedMultiplier = trainer2Active.statusCondition === StatusCondition.Paralysis ? 0.5 : 1.0;

        const trainer1FinalSpeed = trainer1Speed * trainer1SpeedMultiplier;
        const trainer2FinalSpeed = trainer2Speed * trainer2SpeedMultiplier;

        // 速度比較
        if (trainer1FinalSpeed >= trainer2FinalSpeed) {
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
  ): Promise<string> {
    // 技情報を取得
    const move = await this.moveRepository.findById(moveId);

    if (!move) {
      throw new Error('Move not found');
    }

    // 変化技の場合はダメージなし
    if (move.category === 'Status' || move.power === null) {
      return `Used ${move.name} (Status move)`;
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

    return `Used ${move.name} and dealt ${damage} damage`;
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
      await this.battleRepository.updateBattlePokemonStatus(currentActive.id, {
        isActive: false,
      });
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
   * ターン終了時の特性効果を処理
   */
  private async processTurnEndAbilities(battle: Battle): Promise<void> {
    const battleStatuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const activePokemon = battleStatuses.filter(s => s.isActive);

    for (const status of activePokemon) {
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
