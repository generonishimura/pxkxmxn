import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { Battle, Weather, Field, BattleStatus } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { StatusCondition } from '../../domain/entities/status-condition.enum';

/**
 * BattleのPrismaクエリ結果型
 */
type BattleData = Prisma.BattleGetPayload<{}>;

/**
 * BattlePokemonStatusのPrismaクエリ結果型
 */
type BattlePokemonStatusData = Prisma.BattlePokemonStatusGetPayload<{}>;

/**
 * Battle更新用の型（リレーションなし）
 */
type BattleUpdateInput = Prisma.BattleUncheckedUpdateInput;

/**
 * BattlePokemonStatus更新用の型
 */
type BattlePokemonStatusUpdateInput = Prisma.BattlePokemonStatusUpdateInput;

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
      },
    });

    return this.toBattleEntity(battleData);
  }

  async update(id: number, data: Partial<Battle>): Promise<Battle> {
    const updateData: BattleUpdateInput = {};

    if (data.turn !== undefined) updateData.turn = data.turn;
    if (data.weather !== undefined) updateData.weather = data.weather as Weather;
    if (data.field !== undefined) updateData.field = data.field as Field;
    if (data.status !== undefined) updateData.status = data.status as BattleStatus;
    if (data.winnerTrainerId !== undefined) updateData.winnerTrainerId = data.winnerTrainerId;

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
    if (data.statusCondition !== undefined)
      updateData.statusCondition = data.statusCondition as StatusCondition;

    const statusData = await this.prisma.battlePokemonStatus.update({
      where: { id },
      data: updateData,
    });

    return this.toBattlePokemonStatusEntity(statusData);
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
    );
  }

  /**
   * PrismaのBattlePokemonStatusモデルをDomain層のBattlePokemonStatusエンティティに変換
   */
  private toBattlePokemonStatusEntity(statusData: BattlePokemonStatusData): BattlePokemonStatus {
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
      this.mapStatusCondition(statusData.statusCondition),
    );
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
}
