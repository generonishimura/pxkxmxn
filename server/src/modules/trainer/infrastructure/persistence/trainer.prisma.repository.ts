import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  ITrainerRepository,
  TRAINER_REPOSITORY_TOKEN,
} from '../../domain/trainer.repository.interface';
import { Trainer } from '../../domain/entities/trainer.entity';

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
    const updateData: any = {};

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

    return trainerList.map((trainer) => this.toTrainerEntity(trainer));
  }

  /**
   * PrismaのTrainerモデルをDomain層のTrainerエンティティに変換
   */
  private toTrainerEntity(trainerData: any): Trainer {
    return new Trainer(
      trainerData.id,
      trainerData.name,
      trainerData.email,
      trainerData.createdAt,
      trainerData.updatedAt,
    );
  }
}

