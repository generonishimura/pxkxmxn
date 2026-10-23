import { Injectable, Inject, Optional } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from '../../domain/battle.repository.interface';
import {
  ITeamRepository,
  ITrainedPokemonRepository,
  TEAM_REPOSITORY_TOKEN,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
  TeamMemberInfo,
} from '@/modules/trainer/domain/trainer.repository.interface';
import {
  IMoveRepository,
  MOVE_REPOSITORY_TOKEN,
} from '@/modules/pokemon/domain/pokemon.repository.interface';
import { Battle } from '../../domain/entities/battle.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { getItemEffect } from '@/modules/pokemon/domain/battle-events/item-lookup';
import { TrainedPokemon } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { updateVolatileState } from '../../domain/state/volatile-state';
// タイプ変更・フォルムチェンジ・特性の書き換えの仕組み（Issue #119 #135 一部）
import {
  battleAbilityNameOf,
  battleMaxHpOf,
  battleStatsOf,
} from '../../domain/logic/battle-pokemon-traits';
import { NEUTRALIZING_GAS_ABILITY_NAME } from '../../domain/logic/effective-traits';
import { PrimalWeatherReleaser } from '../services/primal-weather-releaser';
import { ValidationException } from '@/shared/domain/exceptions';
import { findTeamRuleProblem, teamRuleProblemMessage } from '../../domain/logic/team-rule';
import {
  findRegulationProblem,
  regulationProblemMessage,
} from '../../domain/logic/regulation-rule';
import { CURRENT_REGULATION } from '../../domain/regulations/current-regulation';
import { Regulation } from '../../domain/regulations/regulation';

/**
 * バトルを始めるときに確かめるレギュレーションのトークン（テストで、ほかのレギュレーションに差し替えるのに使う。
 * 登録しなければ CURRENT_REGULATION）
 */
export const REGULATION_TOKEN = 'REGULATION';

/**
 * 先発の onEntry を先に呼ぶ特性（大きいほど先。ほかの特性は 0）
 * - イリュージョン: 本家の BeforeSwitchIn。先発全員の BeforeSwitchIn が、どの SwitchIn よりも先に済む
 * - かがくへんかガス・テラスチェンジ: 本家の onSwitchInPriority 2
 */
const LEAD_ENTRY_PRIORITY: Readonly<Record<string, number>> = {
  イリュージョン: 3,
  [NEUTRALIZING_GAS_ABILITY_NAME]: 2,
  テラスチェンジ: 2,
};

/**
 * StartBattleUseCase
 * バトル開始時の処理を実行するユースケース
 *
 * 処理内容:
 * 0. 両チームの手持ちが、チャンピオンズのシングルのルール（3〜6 体・持ち物の重複なし・全国図鑑の番号の重複なし）に
 *    合うかと、レギュレーション（既定は CURRENT_REGULATION）で使えるポケモン・持ち物だけかを確かめる。
 *    合わなければ、何も書き込まずに ValidationException で弾く
 *    注: 選出（6 体から 3 体を選ぶ）の API はない。戦うポケモンは、バトルを始めるチームを選ぶことで決める
 * 1. Battleエンティティの作成
 * 2. 両チームのポケモン状態（BattlePokemonStatus）を初期化し、最初のポケモンを場に出す（position=1のポケモン）
 * 3. 両方の先発が場に出てから、先発の特性のOnEntry効果を、イリュージョン → かがくへんかガス・テラスチェンジ → 素早さの高い順に発動
 * 4. 効かなくなった特性のゲンシ天候を終わらせる
 */
@Injectable()
export class StartBattleUseCase {
  /**
   * 先発の switchedInTurn。ターン N に交代で出たポケモンは N になり、出てから最初に
   * 行動するのは N + 1。先発はターン 1 から行動するので 0 にする
   */
  private static readonly STARTER_SWITCHED_IN_TURN = 0;

  /** 手持ちが合うかを確かめるレギュレーション */
  private readonly regulation: Regulation;

  constructor(
    @Inject(BATTLE_REPOSITORY_TOKEN)
    private readonly battleRepository: IBattleRepository,
    @Inject(TEAM_REPOSITORY_TOKEN)
    private readonly teamRepository: ITeamRepository,
    @Inject(MOVE_REPOSITORY_TOKEN)
    private readonly moveRepository: IMoveRepository,
    @Inject(TRAINED_POKEMON_REPOSITORY_TOKEN)
    private readonly trainedPokemonRepository: ITrainedPokemonRepository,
    @Optional()
    @Inject(REGULATION_TOKEN)
    regulation?: Regulation,
  ) {
    this.regulation = regulation ?? CURRENT_REGULATION;
  }

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
    // 1. 両チームのポケモン情報を取得し、手持ちのルールとレギュレーションを、書き込みより前に確かめる
    const team1Members = await this.teamRepository.findMembersByTeamId(team1Id);
    const team2Members = await this.teamRepository.findMembersByTeamId(team2Id);
    for (const [members, field] of [
      [team1Members, 'team1Id'],
      [team2Members, 'team2Id'],
    ] as const) {
      const team = members.map(member => member.trainedPokemon);
      const problem = findTeamRuleProblem(team);
      if (problem) {
        throw new ValidationException(teamRuleProblemMessage(problem), field);
      }
      const regulationProblem = findRegulationProblem(team, this.regulation);
      if (regulationProblem) {
        throw new ValidationException(
          regulationProblemMessage(regulationProblem, this.regulation),
          field,
        );
      }
    }

    // 2. Battleエンティティを作成
    const battle = await this.battleRepository.create({
      trainer1Id,
      trainer2Id,
      team1Id,
      team2Id,
    });
    // 場に出たときの特性で、場のポケモンの実効の特性（かがくへんかガス）を求めるのに使う
    const trainedPokemons = new Map(
      [...team1Members, ...team2Members].map(member => [
        member.trainedPokemon.id,
        member.trainedPokemon,
      ]),
    );

    // 3. 両チームのすべてのポケモンの BattlePokemonStatus を作り、先発（position=1）を場に出す。
    // 先発の onEntry は、両方の先発が場に出てから呼ぶ（かわりもの・トレースが相手を、イリュージョンが手持ちを見つけられる）
    const leadStatusIds: number[] = [];
    const itemLeadStatusIds: number[] = [];
    for (const [members, trainerId] of [
      [team1Members, trainer1Id],
      [team2Members, trainer2Id],
    ] as const) {
      for (const member of members) {
        const leadStatusId = await this.createBattlePokemonStatus(battle, member, trainerId);
        // 持ち物のないポケモンは、持ち物の onEntry を呼ばない
        if (leadStatusId !== undefined && member.trainedPokemon.heldItem) {
          itemLeadStatusIds.push(leadStatusId);
        }
        // 特性のないポケモンは onEntry を呼ばない
        if (leadStatusId !== undefined && member.trainedPokemon.ability) {
          leadStatusIds.push(leadStatusId);
        }
      }
    }

    // 4. 先発の特性の onEntry を、イリュージョン → かがくへんかガス・テラスチェンジ → 素早さの高い順に呼ぶ（本家の順。
    // イリュージョンは BeforeSwitchIn なので、どの SwitchIn よりも先。かがくへんかガス・テラスチェンジは
    // onSwitchInPriority 2 で先に出るので、相手のゲンシ天候などは始まらず、かわりものはテラスタルフォルムを写す）
    for (const statusId of await this.orderLeadsForEntry(
      battle.id,
      leadStatusIds,
      trainedPokemons,
    )) {
      await this.triggerAbilityOnEntry(statusId, trainedPokemons, battle);
    }

    // 4.5. 先発の持ち物の onEntry を、特性のあとに素早さの高い順で呼ぶ（エレキシードなど。本家の onSwitchInPriority -1）
    for (const statusId of await this.orderLeadsForEntry(
      battle.id,
      itemLeadStatusIds,
      trainedPokemons,
    )) {
      await this.triggerItemOnEntry(statusId, battle);
    }

    // 5. 先発の onEntry で始まったゲンシ天候の特性が、あとから効かなくなっていれば天候を終わらせる
    await new PrimalWeatherReleaser(
      this.battleRepository,
      this.trainedPokemonRepository,
    ).releaseIfAbilityLost(battle.id);

    return battle;
  }

  /**
   * ポケモン 1 匹分の BattlePokemonStatus と技を作り、先発（position=1）なら場に出す
   * @returns 先発なら BattlePokemonStatus の ID、控えなら undefined
   */
  private async createBattlePokemonStatus(
    battle: Battle,
    member: TeamMemberInfo,
    trainerId: number,
  ): Promise<number | undefined> {
    const trainedPokemon = member.trainedPokemon;

    // 最大 HP を計算（フォルムが変わるポケモンは、表の既定のフォルムの HP の種族値で計算する）
    const maxHp = battleMaxHpOf(trainedPokemon, undefined);

    // BattlePokemonStatusを作成
    const battleStatus = await this.battleRepository.createBattlePokemonStatus({
      battleId: battle.id,
      trainedPokemonId: trainedPokemon.id,
      trainerId,
      currentHp: maxHp,
      maxHp,
    });

    // 持ち物を、バトル中の今の持ち物として書く（交代しても残る状態）
    if (trainedPokemon.heldItem !== null) {
      await this.battleRepository.patchPersistentState(battleStatus.id, {
        item: trainedPokemon.heldItem,
      });
    }

    // ポケモンが覚えている技を取得してBattlePokemonMoveを作成
    await this.initializePokemonMoves(battleStatus.id, trainedPokemon.pokemon.id);

    if (member.position !== 1) {
      return undefined;
    }
    // 最初のポケモン（position=1）を場に出す
    await this.battleRepository.updateBattlePokemonStatus(battleStatus.id, {
      isActive: true,
      volatileState: updateVolatileState(battleStatus.volatileState, {
        switchedInTurn: StartBattleUseCase.STARTER_SWITCHED_IN_TURN,
      }),
    });
    return battleStatus.id;
  }

  /**
   * 先発の onEntry を呼ぶ順（実効の特性の LEAD_ENTRY_PRIORITY の大きい順 → 素早さの高い順。同じならトレーナー 1 から）
   * 注: 素早さは実数値だけで比べる（ランク・特性・持ち物の補正と、同じ素早さの乱数は見ない）
   */
  private async orderLeadsForEntry(
    battleId: number,
    leadStatusIds: readonly number[],
    trainedPokemons: ReadonlyMap<number, TrainedPokemon>,
  ): Promise<number[]> {
    if (leadStatusIds.length <= 1) {
      return [...leadStatusIds];
    }
    const statuses = await this.battleRepository.findBattlePokemonStatusByBattleId(battleId);
    const refs = (statuses ?? []).flatMap(status => {
      const trainedPokemon = trainedPokemons.get(status.trainedPokemonId);
      return status.isActive && trainedPokemon ? [{ trainedPokemon, status }] : [];
    });
    const keyOf = (statusId: number) => {
      const ref = refs.find(other => other.status.id === statusId);
      if (!ref) {
        return { priority: 0, speed: 0 };
      }
      const abilityName = battleAbilityNameOf(ref.trainedPokemon, ref.status, refs);
      return {
        priority: abilityName ? (LEAD_ENTRY_PRIORITY[abilityName] ?? 0) : 0,
        speed: battleStatsOf(ref.trainedPokemon, ref.status).speed,
      };
    };
    const keys = new Map(leadStatusIds.map(id => [id, keyOf(id)]));
    return [...leadStatusIds].sort((a, b) => {
      const keyA = keys.get(a)!;
      const keyB = keys.get(b)!;
      return keyB.priority - keyA.priority || keyB.speed - keyA.speed;
    });
  }

  /**
   * 特性のOnEntry効果を発動
   * 特性は、場にいる相手のかがくへんかガスで消えていれば発動しない（実効の特性）
   * @param trainedPokemons 両チームの育成ポケモン（TrainedPokemon の ID ごと）
   */
  private async triggerAbilityOnEntry(
    battleStatusId: number,
    trainedPokemons: ReadonlyMap<number, TrainedPokemon>,
    battle: Battle,
  ): Promise<void> {
    // BattlePokemonStatusを取得
    const battleStatus =
      (await this.battleRepository.findBattlePokemonStatusByBattleId(battle.id)) ?? [];
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

    // 特性効果を発動（先に呼んだ先発の onEntry で変わった天候などを読めるよう、バトルを読み直す）
    // 相手の特性（クリアボディ・ばんけんなど）を調べられるよう、育成ポケモンリポジトリも渡す
    await abilityEffect.onEntry(status, {
      battle: (await this.battleRepository.findById(battle.id)) ?? battle,
      battleRepository: this.battleRepository,
      trainedPokemonRepository: this.trainedPokemonRepository,
    });
  }

  /**
   * 持ち物の onEntry を呼ぶ（場に出たときに使う持ち物。ひんし・持ち物がなければ呼ばない）
   */
  private async triggerItemOnEntry(battleStatusId: number, battle: Battle): Promise<void> {
    const status = await this.battleRepository.findBattlePokemonStatusById(battleStatusId);
    if (!status || status.isFainted()) {
      return;
    }
    await getItemEffect(status)?.onEntry?.(status, {
      battle: (await this.battleRepository.findById(battle.id)) ?? battle,
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
