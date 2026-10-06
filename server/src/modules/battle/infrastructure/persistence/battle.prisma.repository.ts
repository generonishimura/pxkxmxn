import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, Weather, Field, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { BattlePokemonMove } from '../../domain/entities/battle-pokemon-move.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';
import { NotFoundException } from '@/shared/domain/exceptions';
import { StatePatch } from '../../domain/state/state-field-parser';
import {
  VolatileState,
  emptyVolatileState,
  parseVolatileState,
  updateVolatileState,
} from '../../domain/state/volatile-state';
import {
  isLegacyVolatileStatusCondition,
  normalizeLegacyStatusCondition,
} from '../../domain/logic/volatile-status-condition';
import {
  GlobalFieldState,
  SideConditions,
  SideState,
  emptySideState,
  parseSideState,
  updateGlobalFieldState,
  updateSideConditions,
} from '../../domain/state/side-state';
import {
  PersistentPokemonState,
  emptyPersistentPokemonState,
  parsePersistentPokemonState,
  updatePersistentPokemonState,
} from '../../domain/state/persistent-state';

/**
 * BattleのPrismaクエリ結果型
 */
type BattleData = Prisma.BattleGetPayload<{}>;

/**
 * BattlePokemonStatusのPrismaクエリ結果型
 */
type BattlePokemonStatusData = Prisma.BattlePokemonStatusGetPayload<{}>;

/**
 * BattlePokemonMoveのPrismaクエリ結果型
 */
type BattlePokemonMoveData = Prisma.BattlePokemonMoveGetPayload<{}>;

/**
 * Battle更新用の型（リレーションなし）
 */
type BattleUpdateInput = Prisma.BattleUncheckedUpdateInput;

/**
 * BattlePokemonStatus更新用の型
 */
type BattlePokemonStatusUpdateInput = Prisma.BattlePokemonStatusUpdateInput;

/**
 * 状態の部分更新で、トランザクションの中から使う操作だけを持つクライアントの型
 * $transaction のコールバックが受け取るクライアントは、この操作をすべて持つ
 */
type StateTransactionClient = Pick<PrismaService, 'battle' | 'battlePokemonStatus' | '$queryRaw'>;

/**
 * BattleリポジトリのPrisma実装
 * Domain層で定義したインターフェースの具象実装
 */
@Injectable()
export class BattlePrismaRepository implements IBattleRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Battle | null> {
    const battleData = await this.prisma.battle.findUnique({
      where: { id },
    });

    if (!battleData) {
      return null;
    }

    return this.toBattleEntity(battleData);
  }

  async create(data: {
    trainer1Id: number;
    trainer2Id: number;
    team1Id: number;
    team2Id: number;
  }): Promise<Battle> {
    const battleData = await this.prisma.battle.create({
      data: {
        trainer1Id: data.trainer1Id,
        trainer2Id: data.trainer2Id,
        team1Id: data.team1Id,
        team2Id: data.team2Id,
        turn: 1,
        weather: 'None',
        field: 'None',
        status: 'Active',
        sideState: this.toJsonObject(emptySideState()),
      },
    });

    return this.toBattleEntity(battleData);
  }

  async update(id: number, data: Partial<Battle>): Promise<Battle> {
    const updateData: BattleUpdateInput = {};

    if (data.turn !== undefined) updateData.turn = data.turn;
    // Prismaスキーマでenum型として定義されているため、Domain層のenum型をそのまま使用可能
    // BattleUncheckedUpdateInputは $Enums.Weather | null を許容する
    if (data.weather !== undefined) updateData.weather = data.weather as Weather;
    if (data.field !== undefined) updateData.field = data.field as Field;
    if (data.status !== undefined) updateData.status = data.status as BattleStatus;
    if (data.winnerTrainerId !== undefined) updateData.winnerTrainerId = data.winnerTrainerId;
    // 状態の列は NOT NULL の JSON なので、null を渡されたときは空の状態を書く
    // （strictNullChecks が無効なので、型では null を防げない）
    if (data.sideState !== undefined)
      updateData.sideState = this.toJsonObject(data.sideState ?? emptySideState());

    const battleData = await this.prisma.battle.update({
      where: { id },
      data: updateData,
    });

    return this.toBattleEntity(battleData);
  }

  async findBattlePokemonStatusByBattleId(battleId: number): Promise<BattlePokemonStatus[]> {
    const statusList = await this.prisma.battlePokemonStatus.findMany({
      where: { battleId },
    });

    return statusList.map(status => this.toBattlePokemonStatusEntity(status));
  }

  async createBattlePokemonStatus(data: {
    battleId: number;
    trainedPokemonId: number;
    trainerId: number;
    currentHp: number;
    maxHp: number;
  }): Promise<BattlePokemonStatus> {
    const statusData = await this.prisma.battlePokemonStatus.create({
      data: {
        battleId: data.battleId,
        trainedPokemonId: data.trainedPokemonId,
        trainerId: data.trainerId,
        currentHp: data.currentHp,
        maxHp: data.maxHp,
        isActive: false,
        attackRank: 0,
        defenseRank: 0,
        specialAttackRank: 0,
        specialDefenseRank: 0,
        speedRank: 0,
        accuracyRank: 0,
        evasionRank: 0,
        statusCondition: 'None',
        volatileState: this.toJsonObject(emptyVolatileState()),
        persistentState: this.toJsonObject(emptyPersistentPokemonState()),
      },
    });

    return this.toBattlePokemonStatusEntity(statusData);
  }

  async updateBattlePokemonStatus(
    id: number,
    data: Partial<BattlePokemonStatus>,
  ): Promise<BattlePokemonStatus> {
    const updateData: BattlePokemonStatusUpdateInput = {};

    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.currentHp !== undefined) updateData.currentHp = data.currentHp;
    if (data.maxHp !== undefined) updateData.maxHp = data.maxHp;
    if (data.attackRank !== undefined) updateData.attackRank = data.attackRank;
    if (data.defenseRank !== undefined) updateData.defenseRank = data.defenseRank;
    if (data.specialAttackRank !== undefined) updateData.specialAttackRank = data.specialAttackRank;
    if (data.specialDefenseRank !== undefined)
      updateData.specialDefenseRank = data.specialDefenseRank;
    if (data.speedRank !== undefined) updateData.speedRank = data.speedRank;
    if (data.accuracyRank !== undefined) updateData.accuracyRank = data.accuracyRank;
    if (data.evasionRank !== undefined) updateData.evasionRank = data.evasionRank;
    // Prismaスキーマでenum型として定義されているため、Domain層のenum型をそのまま使用可能
    // BattlePokemonStatusUpdateInputは $Enums.StatusCondition | null を許容する
    if (data.statusCondition !== undefined)
      updateData.statusCondition = data.statusCondition as StatusCondition;
    // 状態の列は NOT NULL の JSON なので、null を渡されたときは空の状態を書く
    if (data.volatileState !== undefined)
      updateData.volatileState = this.toJsonObject(data.volatileState ?? emptyVolatileState());
    if (data.persistentState !== undefined)
      updateData.persistentState = this.toJsonObject(
        data.persistentState ?? emptyPersistentPokemonState(),
      );

    const statusData = await this.prisma.battlePokemonStatus.update({
      where: { id },
      data: updateData,
    });

    return this.toBattlePokemonStatusEntity(statusData);
  }

  async patchVolatileState(
    statusId: number,
    patch: StatePatch<VolatileState>,
  ): Promise<BattlePokemonStatus> {
    const statusData = await this.prisma.$transaction(async (tx: StateTransactionClient) => {
      const current = await this.lockBattlePokemonStatus(tx, statusId);
      // 古い行のこんらん・ひるみ（statusCondition）は、ここで volatileState に移して None にする
      const legacy = isLegacyVolatileStatusCondition(current.statusCondition);
      const next = updateVolatileState(this.readVolatileState(current), patch);
      return tx.battlePokemonStatus.update({
        where: { id: statusId },
        data: {
          volatileState: this.toJsonObject(next),
          ...(legacy ? { statusCondition: 'None' as const } : {}),
        },
      });
    });

    return this.toBattlePokemonStatusEntity(statusData);
  }

  async patchPersistentState(
    statusId: number,
    patch: StatePatch<PersistentPokemonState>,
  ): Promise<BattlePokemonStatus> {
    const statusData = await this.prisma.$transaction(async (tx: StateTransactionClient) => {
      const current = await this.lockBattlePokemonStatus(tx, statusId);
      const next = updatePersistentPokemonState(
        parsePersistentPokemonState(current.persistentState),
        patch,
      );
      return tx.battlePokemonStatus.update({
        where: { id: statusId },
        data: { persistentState: this.toJsonObject(next) },
      });
    });

    return this.toBattlePokemonStatusEntity(statusData);
  }

  async patchSideConditions(
    battleId: number,
    trainerId: number,
    patch: StatePatch<SideConditions>,
  ): Promise<Battle> {
    return this.patchSideState(battleId, state => updateSideConditions(state, trainerId, patch));
  }

  async patchGlobalFieldState(
    battleId: number,
    patch: StatePatch<GlobalFieldState>,
  ): Promise<Battle> {
    return this.patchSideState(battleId, state => updateGlobalFieldState(state, patch));
  }

  /**
   * 最新の sideState を読み直し、change を当てて書き込む
   */
  private async patchSideState(
    battleId: number,
    change: (state: SideState) => SideState,
  ): Promise<Battle> {
    const battleData = await this.prisma.$transaction(async (tx: StateTransactionClient) => {
      // 同じ行を同時に部分更新したときに片方の変更が消えないよう、行をロックしてから読む
      await tx.$queryRaw`SELECT id FROM battles WHERE id = ${battleId} FOR UPDATE`;
      const current = await tx.battle.findUnique({ where: { id: battleId } });
      if (!current) {
        throw new NotFoundException('Battle', battleId);
      }
      const next = change(parseSideState(current.sideState));
      return tx.battle.update({
        where: { id: battleId },
        data: { sideState: this.toJsonObject(next) },
      });
    });

    return this.toBattleEntity(battleData);
  }

  /**
   * トランザクションの中で BattlePokemonStatus の行をロックしてから読む
   * 同じ行を同時に部分更新したときに、片方の変更が消えないようにするため
   */
  private async lockBattlePokemonStatus(
    tx: StateTransactionClient,
    statusId: number,
  ): Promise<BattlePokemonStatusData> {
    await tx.$queryRaw`SELECT id FROM battle_pokemon_status WHERE id = ${statusId} FOR UPDATE`;
    const current = await tx.battlePokemonStatus.findUnique({ where: { id: statusId } });
    if (!current) {
      throw new NotFoundException('BattlePokemonStatus', statusId);
    }
    return current;
  }

  async findActivePokemonByBattleIdAndTrainerId(
    battleId: number,
    trainerId: number,
  ): Promise<BattlePokemonStatus | null> {
    const statusData = await this.prisma.battlePokemonStatus.findFirst({
      where: {
        battleId,
        trainerId,
        isActive: true,
      },
    });

    if (!statusData) {
      return null;
    }

    return this.toBattlePokemonStatusEntity(statusData);
  }

  async findBattlePokemonStatusById(id: number): Promise<BattlePokemonStatus | null> {
    const statusData = await this.prisma.battlePokemonStatus.findUnique({
      where: { id },
    });

    if (!statusData) {
      return null;
    }

    return this.toBattlePokemonStatusEntity(statusData);
  }

  /**
   * PrismaのBattleモデルをDomain層のBattleエンティティに変換
   */
  private toBattleEntity(battleData: BattleData): Battle {
    return new Battle(
      battleData.id,
      battleData.trainer1Id,
      battleData.trainer2Id,
      battleData.team1Id,
      battleData.team2Id,
      battleData.turn,
      this.mapWeather(battleData.weather),
      this.mapField(battleData.field),
      this.mapBattleStatus(battleData.status),
      battleData.winnerTrainerId,
      // JSON 列は古い行や壊れた値もありうるので、例外を投げない parse で読む
      parseSideState(battleData.sideState),
    );
  }

  /**
   * PrismaのBattlePokemonStatusモデルをDomain層のBattlePokemonStatusエンティティに変換
   */
  private toBattlePokemonStatusEntity(statusData: BattlePokemonStatusData): BattlePokemonStatus {
    // こんらん・ひるみは volatileState に移したので、古い行の statusCondition の値は読み替える
    const normalized = normalizeLegacyStatusCondition(
      this.mapStatusCondition(statusData.statusCondition),
      parseVolatileState(statusData.volatileState),
    );
    return new BattlePokemonStatus(
      statusData.id,
      statusData.battleId,
      statusData.trainedPokemonId,
      statusData.trainerId,
      statusData.isActive,
      statusData.currentHp,
      statusData.maxHp,
      statusData.attackRank,
      statusData.defenseRank,
      statusData.specialAttackRank,
      statusData.specialDefenseRank,
      statusData.speedRank,
      statusData.accuracyRank,
      statusData.evasionRank,
      normalized.statusCondition,
      normalized.volatileState,
      parsePersistentPokemonState(statusData.persistentState),
    );
  }

  /**
   * 行の volatileState を読む
   * JSON 列は古い行や壊れた値もありうるので、例外を投げない parse で読む。
   * 古い行の statusCondition のこんらんは confusionTurns に読み替える
   */
  private readVolatileState(statusData: BattlePokemonStatusData): VolatileState {
    return normalizeLegacyStatusCondition(
      this.mapStatusCondition(statusData.statusCondition),
      parseVolatileState(statusData.volatileState),
    ).volatileState;
  }

  /**
   * Domain層の状態を Prisma の JSON 列に書ける形にする
   * 状態の型はすべて JSON にできる値（数値・真偽値・文字列・配列・オブジェクト）だけで組んでいる
   */
  private toJsonObject(
    state: VolatileState | PersistentPokemonState | SideState,
  ): Prisma.InputJsonObject {
    return state;
  }

  /**
   * PrismaのWeather enumをDomain層のWeather enumに変換
   */
  private mapWeather(weather: string | null): Weather | null {
    if (!weather || weather === 'None') {
      return null;
    }
    return weather as Weather;
  }

  /**
   * PrismaのField enumをDomain層のField enumに変換
   */
  private mapField(field: string | null): Field | null {
    if (!field || field === 'None') {
      return null;
    }
    return field as Field;
  }

  /**
   * PrismaのBattleStatus enumをDomain層のBattleStatus enumに変換
   */
  private mapBattleStatus(status: string): BattleStatus {
    return status as BattleStatus;
  }

  /**
   * PrismaのStatusCondition enumをDomain層のStatusCondition enumに変換
   */
  private mapStatusCondition(statusCondition: string | null): StatusCondition | null {
    if (!statusCondition || statusCondition === 'None') {
      return null;
    }
    return statusCondition as StatusCondition;
  }

  async findBattlePokemonMovesByBattlePokemonStatusId(
    battlePokemonStatusId: number,
  ): Promise<BattlePokemonMove[]> {
    const moveList = await this.prisma.battlePokemonMove.findMany({
      where: { battlePokemonStatusId },
    });

    return moveList.map(move => this.toBattlePokemonMoveEntity(move));
  }

  async createBattlePokemonMove(data: {
    battlePokemonStatusId: number;
    moveId: number;
    currentPp: number;
    maxPp: number;
  }): Promise<BattlePokemonMove> {
    const moveData = await this.prisma.battlePokemonMove.create({
      data: {
        battlePokemonStatusId: data.battlePokemonStatusId,
        moveId: data.moveId,
        currentPp: data.currentPp,
        maxPp: data.maxPp,
      },
    });

    return this.toBattlePokemonMoveEntity(moveData);
  }

  async updateBattlePokemonMove(
    id: number,
    data: { currentPp: number },
  ): Promise<BattlePokemonMove> {
    const moveData = await this.prisma.battlePokemonMove.update({
      where: { id },
      data: {
        currentPp: data.currentPp,
      },
    });

    return this.toBattlePokemonMoveEntity(moveData);
  }

  async findBattlePokemonMoveById(id: number): Promise<BattlePokemonMove | null> {
    const moveData = await this.prisma.battlePokemonMove.findUnique({
      where: { id },
    });

    if (!moveData) {
      return null;
    }

    return this.toBattlePokemonMoveEntity(moveData);
  }

  /**
   * PrismaのBattlePokemonMoveモデルをDomain層のBattlePokemonMoveエンティティに変換
   */
  private toBattlePokemonMoveEntity(moveData: BattlePokemonMoveData): BattlePokemonMove {
    return new BattlePokemonMove(
      moveData.id,
      moveData.battlePokemonStatusId,
      moveData.moveId,
      moveData.currentPp,
      moveData.maxPp,
    );
  }
}
