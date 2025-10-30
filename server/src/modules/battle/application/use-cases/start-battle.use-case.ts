import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITeamRepository,
  TEAM_REPOSITORY_TOKEN,
} from '../../../trainer/domain/trainer.repository.interface';
import { Battle } from '../../domain/entities/battle.entity';
import { StatCalculator, TrainedPokemonStats } from '../../domain/logic/stat-calculator';
import { AbilityRegistry } from '../../../pokemon/domain/abilities/ability-registry';
import { TrainedPokemon } from '../../../trainer/domain/entities/trained-pokemon.entity';

/**
 * StartBattleUseCase
 * バトル開始時の処理を実行するユースケース
 *
 * 処理内容:
 * 1. Battleエンティティの作成
 * 2. 両チームのポケモン状態（BattlePokemonStatus）を初期化
 * 3. 最初のポケモンを場に出す（position=1のポケモン）
 * 4. 特性のOnEntry効果を発動
 */
@Injectable()
export class StartBattleUseCase {
  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TEAM_REPOSITORY_TOKEN)
    private readonly teamRepository: ITeamRepository,
  ) {}

  /**
   * バトルを開始
   * @param trainer1Id トレーナー1のID
   * @param trainer2Id トレーナー2のID
   * @param team1Id チーム1のID
   * @param team2Id チーム2のID
   * @returns 作成されたBattleエンティティ
   */
  async execute(
    trainer1Id: number,
    trainer2Id: number,
    team1Id: number,
    team2Id: number,
  ): Promise<Battle> {
    // 1. Battleエンティティを作成
    const battle = await this.battleRepository.create({
      trainer1Id,
      trainer2Id,
      team1Id,
      team2Id,
    });

    // 2. 両チームのポケモン情報を取得
    const team1Members = await this.teamRepository.findMembersByTeamId(team1Id);
    const team2Members = await this.teamRepository.findMembersByTeamId(team2Id);

    // 3. 各ポケモンのBattlePokemonStatusを作成
    for (const member of team1Members) {
      const trainedPokemon = member.trainedPokemon;

      // ステータスを計算
      const stats = this.calculateStats(trainedPokemon);
      const calculatedStats = StatCalculator.calculate(stats);

      // BattlePokemonStatusを作成
      const battleStatus = await this.battleRepository.createBattlePokemonStatus({
        battleId: battle.id,
        trainedPokemonId: trainedPokemon.id,
        trainerId: trainer1Id,
        currentHp: calculatedStats.hp,
        maxHp: calculatedStats.hp,
      });

      // 最初のポケモン（position=1）を場に出す
      if (member.position === 1) {
        await this.battleRepository.updateBattlePokemonStatus(battleStatus.id, {
          isActive: true,
        });

        // 特性のOnEntry効果を発動
        if (trainedPokemon.ability) {
          await this.triggerAbilityOnEntry(
            battleStatus.id,
            trainedPokemon.ability.name,
            battle,
          );
        }
      }
    }

    for (const member of team2Members) {
      const trainedPokemon = member.trainedPokemon;

      // ステータスを計算
      const stats = this.calculateStats(trainedPokemon);
      const calculatedStats = StatCalculator.calculate(stats);

      // BattlePokemonStatusを作成
      const battleStatus = await this.battleRepository.createBattlePokemonStatus({
        battleId: battle.id,
        trainedPokemonId: trainedPokemon.id,
        trainerId: trainer2Id,
        currentHp: calculatedStats.hp,
        maxHp: calculatedStats.hp,
      });

      // 最初のポケモン（position=1）を場に出す
      if (member.position === 1) {
        await this.battleRepository.updateBattlePokemonStatus(battleStatus.id, {
          isActive: true,
        });

        // 特性のOnEntry効果を発動
        if (trainedPokemon.ability) {
          await this.triggerAbilityOnEntry(
            battleStatus.id,
            trainedPokemon.ability.name,
            battle,
          );
        }
      }
    }

    return battle;
  }

  /**
   * TrainedPokemonからステータス情報を計算
   */
  private calculateStats(trainedPokemon: TrainedPokemon): TrainedPokemonStats {
    return {
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
    };
  }

  /**
   * 特性のOnEntry効果を発動
   */
  private async triggerAbilityOnEntry(
    battleStatusId: number,
    abilityName: string,
    battle: Battle,
  ): Promise<void> {
    const abilityEffect = AbilityRegistry.get(abilityName);
    if (!abilityEffect?.onEntry) {
      return;
    }

    // BattlePokemonStatusを取得
    const battleStatus = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const status = battleStatus.find((s) => s.id === battleStatusId);

    if (!status) {
      return;
    }

    // 特性効果を発動
    await abilityEffect.onEntry(status, {
      battle,
      battleRepository: this.battleRepository,
    });
  }
}

