import { Injectable, Inject } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITeamRepository,
  ITrainedPokemonRepository,
  TEAM_REPOSITORY_TOKEN,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  MOVE_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Battle } from '../../domain/entities/battle.entity';
import { StatCalculator, TrainedPokemonStats } from '../../domain/logic/stat-calculator';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { updateVolatileState } from '../../domain/state/volatile-state';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #119 #135 一部）
import { battleAbilityNameOf } from '../../domain/logic/battle-pokemon-traits';

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
  /**
   * 先発の switchedInTurn。ターン N に交代で出たポケモンは N になり、出てから最初に
   * 行動するのは N + 1。先発はターン 1 から行動するので 0 にする
   */
  private static readonly STARTER_SWITCHED_IN_TURN = 0;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TEAM_REPOSITORY_TOKEN)
    private readonly teamRepository: ITeamRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
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
    // 場に出たときの特性で、場のポケモンの実効の特性（かがくへんかガス）を求めるのに使う
    const trainedPokemons = new Map(
      [...team1Members, ...team2Members].map(member => [
        member.trainedPokemon.id,
        member.trainedPokemon,
      ]),
    );

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

      // ポケモンが覚えている技を取得してBattlePokemonMoveを作成
      await this.initializePokemonMoves(battleStatus.id, trainedPokemon.pokemon.id);

      // 最初のポケモン（position=1）を場に出す
      if (member.position === 1) {
        await this.battleRepository.updateBattlePokemonStatus(battleStatus.id, {
          isActive: true,
          volatileState: updateVolatileState(battleStatus.volatileState, {
            switchedInTurn: StartBattleUseCase.STARTER_SWITCHED_IN_TURN,
          }),
        });

        // 特性のOnEntry効果を発動
        if (trainedPokemon.ability) {
          await this.triggerAbilityOnEntry(battleStatus.id, trainedPokemons, battle);
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

      // ポケモンが覚えている技を取得してBattlePokemonMoveを作成
      await this.initializePokemonMoves(battleStatus.id, trainedPokemon.pokemon.id);

      // 最初のポケモン（position=1）を場に出す
      if (member.position === 1) {
        await this.battleRepository.updateBattlePokemonStatus(battleStatus.id, {
          isActive: true,
          volatileState: updateVolatileState(battleStatus.volatileState, {
            switchedInTurn: StartBattleUseCase.STARTER_SWITCHED_IN_TURN,
          }),
        });

        // 特性のOnEntry効果を発動
        if (trainedPokemon.ability) {
          await this.triggerAbilityOnEntry(battleStatus.id, trainedPokemons, battle);
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
   * 特性は、先に場に出ている相手のかがくへんかガスで消えていれば発動しない（実効の特性）
   * @param trainedPokemons 両チームの育成ポケモン（TrainedPokemon の ID ごと）
   */
  private async triggerAbilityOnEntry(
    battleStatusId: number,
    trainedPokemons: ReadonlyMap<number, TrainedPokemon>,
    battle: Battle,
  ): Promise<void> {
    // BattlePokemonStatusを取得
    const battleStatus = await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id);
    const status = battleStatus.find(s => s.id === battleStatusId);
    const trainedPokemon = status ? trainedPokemons.get(status.trainedPokemonId) : undefined;

    if (!status || !trainedPokemon) {
      return;
    }
    const others = battleStatus.flatMap(other => {
      const otherTrainedPokemon = trainedPokemons.get(other.trainedPokemonId);
      return other.isActive && other.id !== status.id && otherTrainedPokemon
        ? [{ trainedPokemon: otherTrainedPokemon, status: other }]
        : [];
    });
    const abilityName = battleAbilityNameOf(trainedPokemon, status, others);
    const abilityEffect = abilityName ? AbilityRegistry.get(abilityName) : undefined;
    if (!abilityEffect?.onEntry) {
      return;
    }

    // 特性効果を発動
    // 相手の特性（クリアボディ・ばんけんなど）を調べられるよう、育成ポケモンリポジトリも渡す
    await abilityEffect.onEntry(status, {
      battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    });
  }

  /**
   * ポケモンが覚えている技を取得してBattlePokemonMoveを作成
   * @param battlePokemonStatusId バトル中のポケモンステータスID
   * @param pokemonId ポケモンID
   */
  private async initializePokemonMoves(
    battlePokemonStatusId: number,
    pokemonId: number,
  ): Promise<void> {
    // ポケモンが覚えている技を取得(最大4つ)
    const moves = await this.moveRepository.findByPokemonId(pokemonId);

    // 各技のBattlePokemonMoveを作成
    for (const move of moves) {
      await this.battleRepository.createBattlePokemonMove({
        battlePokemonStatusId,
        moveId: move.id,
        currentPp: move.pp, // 初期PPは技の基本PP
        maxPp: move.pp, // 最大PPも技の基本PP
      });
    }
  }
}
