import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import { Battle, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { DamageCalculator, MoveInfo } from '../../domain/logic/damage-calculator';
import { StatCalculator } from '../../domain/logic/stat-calculator';
import { Type } from '../../../pokemon/domain/entities/type.entity';
import { AbilityRegistry } from '../../../pokemon/domain/abilities/ability-registry';

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
    private readonly prisma: PrismaService,
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
            battle: await this.battleRepository.findById(battle.id) as Battle,
            actions: actionResults,
            winnerTrainerId: winner,
          };
        }
      } else if (action.action === 'switch' && action.switchPokemonId) {
        await this.executeSwitch(
          battle,
          action.trainerId,
          action.switchPokemonId,
        );
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
   */
  private async determineActionOrder(
    trainer1Action: ExecuteTurnParams['trainer1Action'],
    trainer2Action: ExecuteTurnParams['trainer2Action'],
    trainer1Active: BattlePokemonStatus,
    trainer2Active: BattlePokemonStatus,
  ): Promise<Array<{ trainerId: number; action: 'move' | 'switch'; moveId?: number; switchPokemonId?: number }>> {
    // 簡易実装: ポケモン交代は常に先に実行
    // 実際の実装では、優先度と速度を考慮する必要がある

    const actions: Array<{ trainerId: number; action: 'move' | 'switch'; moveId?: number; switchPokemonId?: number }> = [];

    // ポケモン交代を先に処理
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

    // 技を使用する場合、実際の速度ステータスで順序を決定
    if (trainer1Action.moveId && trainer2Action.moveId) {
      // 実際の速度ステータスを取得
      const trainer1Speed = await this.getEffectiveSpeed(trainer1Active);
      const trainer2Speed = await this.getEffectiveSpeed(trainer2Active);

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
    const trainedPokemon = await this.prisma.trainedPokemon.findUnique({
      where: { id: status.trainedPokemonId },
      include: {
        pokemon: true,
      },
    });

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
      nature: trainedPokemon.nature as any,
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
    const move = await this.prisma.move.findUnique({
      where: { id: moveId },
      include: { type: true },
    });

    if (!move) {
      throw new Error('Move not found');
    }

    // 変化技の場合はダメージなし
    if (move.category === 'Status' || move.power === null) {
      return `Used ${move.name} (Status move)`;
    }

    // 攻撃側と防御側のポケモン情報を取得
    const attackerTrainedPokemon = await this.prisma.trainedPokemon.findUnique({
      where: { id: attacker.trainedPokemonId },
      include: {
        pokemon: {
          include: {
            primaryType: true,
            secondaryType: true,
          },
        },
        ability: true,
      },
    });

    const defenderTrainedPokemon = await this.prisma.trainedPokemon.findUnique({
      where: { id: defender.trainedPokemonId },
      include: {
        pokemon: {
          include: {
            primaryType: true,
            secondaryType: true,
          },
        },
        ability: true,
      },
    });

    if (!attackerTrainedPokemon || !defenderTrainedPokemon) {
      throw new Error('TrainedPokemon not found');
    }

    // タイプ相性を取得
    const typeEffectiveness = await this.getTypeEffectiveness();

    // 実際のステータス値を計算
    const attackerStats = this.calculateStats(attackerTrainedPokemon);
    const defenderStats = this.calculateStats(defenderTrainedPokemon);

    // ダメージを計算
    const moveInfo: MoveInfo = {
      power: move.power,
      typeId: move.typeId,
      category: move.category as 'Physical' | 'Special' | 'Status',
      accuracy: move.accuracy,
    };

    const damage = DamageCalculator.calculate({
      attacker,
      defender,
      move: moveInfo,
      attackerTypes: {
        primary: new Type(
          attackerTrainedPokemon.pokemon.primaryType.id,
          attackerTrainedPokemon.pokemon.primaryType.name,
          attackerTrainedPokemon.pokemon.primaryType.nameEn,
        ),
        secondary: attackerTrainedPokemon.pokemon.secondaryType
          ? new Type(
              attackerTrainedPokemon.pokemon.secondaryType.id,
              attackerTrainedPokemon.pokemon.secondaryType.name,
              attackerTrainedPokemon.pokemon.secondaryType.nameEn,
            )
          : null,
      },
      defenderTypes: {
        primary: new Type(
          defenderTrainedPokemon.pokemon.primaryType.id,
          defenderTrainedPokemon.pokemon.primaryType.name,
          defenderTrainedPokemon.pokemon.primaryType.nameEn,
        ),
        secondary: defenderTrainedPokemon.pokemon.secondaryType
          ? new Type(
              defenderTrainedPokemon.pokemon.secondaryType.id,
              defenderTrainedPokemon.pokemon.secondaryType.name,
              defenderTrainedPokemon.pokemon.secondaryType.nameEn,
            )
          : null,
      },
      typeEffectiveness,
      weather: battle.weather,
      field: battle.field,
      attackerAbilityName: attackerTrainedPokemon.ability?.name,
      defenderAbilityName: defenderTrainedPokemon.ability?.name,
      attackerStats: attackerStats,
      defenderStats: defenderStats,
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
      (s) => s.trainedPokemonId === trainedPokemonId && s.trainerId === trainerId,
    );

    if (targetStatus) {
      await this.battleRepository.updateBattlePokemonStatus(targetStatus.id, {
        isActive: true,
      });

      // 特性のOnEntry効果を発動
      const trainedPokemon = await this.prisma.trainedPokemon.findUnique({
        where: { id: trainedPokemonId },
        include: { ability: true },
      });

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
    const activePokemon = battleStatuses.filter((s) => s.isActive);

    for (const status of activePokemon) {
      const trainedPokemon = await this.prisma.trainedPokemon.findUnique({
        where: { id: status.trainedPokemonId },
        include: { ability: true },
      });

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
      const trainer1Statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
      const trainer1Alive = trainer1Statuses.filter(
        (s) => s.trainerId === battle.trainer1Id && !s.isFainted(),
      );

      if (trainer1Alive.length === 0) {
        return battle.trainer2Id;
      }
    }

    // トレーナー2のポケモンが倒れている場合
    if (!trainer2Active || trainer2Active.isFainted()) {
      // トレーナー2の他のポケモンがいるか確認
      const trainer2Statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
      const trainer2Alive = trainer2Statuses.filter(
        (s) => s.trainerId === battle.trainer2Id && !s.isFainted(),
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
  private calculateStats(trainedPokemon: any): {
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
      nature: trainedPokemon.nature as any,
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
   * タイプ相性マップを取得
   */
  private async getTypeEffectiveness(): Promise<Map<string, number>> {
    const effectivenessList = await this.prisma.typeEffectiveness.findMany();
    const map = new Map<string, number>();

    for (const eff of effectivenessList) {
      const key = `${eff.typeFromId}-${eff.typeToId}`;
      map.set(key, eff.effectiveness);
    }

    return map;
  }
}

