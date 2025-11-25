import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/shared/prisma/prisma.service';
import { Prisma } from '@generated/prisma/client';
import {
  ITrainerRepository,
  ITrainedPokemonRepository,
  ITeamRepository,
  TeamMemberInfo,
} from '../../domain/trainer.repository.interface';
import { Trainer } from '../../domain/entities/trainer.entity';
import { TrainedPokemon } from '../../domain/entities/trained-pokemon.entity';
import { TrainedPokemonMapper, TrainedPokemonWithRelations } from '@/shared/infrastructure/mappers';

/**
 * TrainerのPrismaクエリ結果型
 */
type TrainerData = Prisma.TrainerGetPayload<{}>;

/**
 * Trainer更新用の型
 */
type TrainerUpdateInput = Prisma.TrainerUpdateInput;



/**
 * TrainerリポジトリのPrisma実装
 * Domain層で定義したインターフェースの具象実装
 */
@Injectable()
export class TrainerPrismaRepository implements ITrainerRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<Trainer | null> {
    const trainerData = await this.prisma.trainer.findUnique({
      where: { id },
    });

    if (!trainerData) {
      return null;
    }

    return this.toTrainerEntity(trainerData);
  }

  async findByName(name: string): Promise<Trainer | null> {
    const trainerData = await this.prisma.trainer.findUnique({
      where: { name },
    });

    if (!trainerData) {
      return null;
    }

    return this.toTrainerEntity(trainerData);
  }

  async findByEmail(email: string): Promise<Trainer | null> {
    const trainerData = await this.prisma.trainer.findUnique({
      where: { email },
    });

    if (!trainerData) {
      return null;
    }

    return this.toTrainerEntity(trainerData);
  }

  async create(data: { name: string; email?: string }): Promise<Trainer> {
    const trainerData = await this.prisma.trainer.create({
      data: {
        name: data.name,
        email: data.email,
      },
    });

    return this.toTrainerEntity(trainerData);
  }

  async update(id: number, data: Partial<Trainer>): Promise<Trainer> {
    const updateData: TrainerUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.email !== undefined) updateData.email = data.email;

    const trainerData = await this.prisma.trainer.update({
      where: { id },
      data: updateData,
    });

    return this.toTrainerEntity(trainerData);
  }

  async delete(id: number): Promise<void> {
    await this.prisma.trainer.delete({
      where: { id },
    });
  }

  async findAll(): Promise<Trainer[]> {
    const trainerList = await this.prisma.trainer.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return trainerList.map(trainer => this.toTrainerEntity(trainer));
  }

  /**
   * PrismaのTrainerモデルをDomain層のTrainerエンティティに変換
   */
  private toTrainerEntity(trainerData: TrainerData): Trainer {
    return new Trainer(
      trainerData.id,
      trainerData.name,
      trainerData.email,
      trainerData.createdAt,
      trainerData.updatedAt,
    );
  }
}

/**
 * TrainedPokemonリポジトリのPrisma実装
 */
@Injectable()
export class TrainedPokemonPrismaRepository implements ITrainedPokemonRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: number): Promise<TrainedPokemon | null> {
    const trainedPokemonData = await this.prisma.trainedPokemon.findUnique({
      where: { id },
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

    if (!trainedPokemonData) {
      return null;
    }

    return this.toDomainEntity(trainedPokemonData);
  }

  async findByTrainerId(trainerId: number): Promise<TrainedPokemon[]> {
    const trainedPokemonList = await this.prisma.trainedPokemon.findMany({
      where: { trainerId },
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

    return trainedPokemonList.map(tp => this.toDomainEntity(tp));
  }

  /**
   * PrismaのデータモデルをDomain層のエンティティに変換
   */
  private toDomainEntity(trainedPokemonData: TrainedPokemonWithRelations): TrainedPokemon {
    return TrainedPokemonMapper.toDomainEntity(trainedPokemonData);
  }
}

/**
 * TeamリポジトリのPrisma実装
 */
@Injectable()
export class TeamPrismaRepository implements ITeamRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMembersByTeamId(teamId: number): Promise<TeamMemberInfo[]> {
    const teamMembers = await this.prisma.teamMember.findMany({
      where: { teamId },
      include: {
        trainedPokemon: {
          include: {
            pokemon: {
              include: {
                primaryType: true,
                secondaryType: true,
              },
            },
            ability: true,
          },
        },
      },
      orderBy: { position: 'asc' },
    });

    return teamMembers.map(member => ({
      id: member.id,
      teamId: member.teamId,
      trainedPokemon: TrainedPokemonMapper.toDomainEntity(member.trainedPokemon),
      position: member.position,
    }));
  }
}
