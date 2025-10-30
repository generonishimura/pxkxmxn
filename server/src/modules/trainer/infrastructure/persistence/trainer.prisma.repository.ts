import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma/prisma.service';
import {
  ITrainerRepository,
  ITrainedPokemonRepository,
  ITeamRepository,
  TeamMemberInfo,
} from '../../domain/trainer.repository.interface';
import { Trainer } from '../../domain/entities/trainer.entity';
import { TrainedPokemon, Gender } from '../../domain/entities/trained-pokemon.entity';
import { Pokemon } from '../../../pokemon/domain/entities/pokemon.entity';
import { Type } from '../../../pokemon/domain/entities/type.entity';
import { Ability } from '../../../pokemon/domain/entities/ability.entity';
import { AbilityTrigger, AbilityCategory } from '../../../pokemon/domain/entities/ability.entity';
import { Nature } from '../../../battle/domain/logic/stat-calculator';

/**
 * TrainedPokemonのPrismaクエリ結果型（include付き）
 * 実際のクエリ結果から推論される型
 */
type TrainedPokemonWithRelations = {
  id: number;
  trainerId: number;
  pokemon: {
    id: number;
    nationalDex: number;
    name: string;
    nameEn: string;
    primaryType: { id: number; name: string; nameEn: string };
    secondaryType: { id: number; name: string; nameEn: string } | null;
    baseHp: number;
    baseAttack: number;
    baseDefense: number;
    baseSpecialAttack: number;
    baseSpecialDefense: number;
    baseSpeed: number;
  };
  nickname: string | null;
  level: number;
  gender: string | null;
  nature: string | null;
  ability: {
    id: number;
    name: string;
    nameEn: string;
    description: string;
    triggerEvent: string;
    effectCategory: string;
  } | null;
  ivHp: number;
  ivAttack: number;
  ivDefense: number;
  ivSpecialAttack: number;
  ivSpecialDefense: number;
  ivSpeed: number;
  evHp: number;
  evAttack: number;
  evDefense: number;
  evSpecialAttack: number;
  evSpecialDefense: number;
  evSpeed: number;
};

/**
 * PrismaのTrainedPokemonデータをDomain層のTrainedPokemonエンティティに変換（共通ヘルパー関数）
 */
function convertTrainedPokemonToEntity(
  trainedPokemonData: TrainedPokemonWithRelations,
): TrainedPokemon {
  const primaryType = new Type(
    trainedPokemonData.pokemon.primaryType.id,
    trainedPokemonData.pokemon.primaryType.name,
    trainedPokemonData.pokemon.primaryType.nameEn,
  );

  const secondaryType = trainedPokemonData.pokemon.secondaryType
    ? new Type(
        trainedPokemonData.pokemon.secondaryType.id,
        trainedPokemonData.pokemon.secondaryType.name,
        trainedPokemonData.pokemon.secondaryType.nameEn,
      )
    : null;

  const pokemon = new Pokemon(
    trainedPokemonData.pokemon.id,
    trainedPokemonData.pokemon.nationalDex,
    trainedPokemonData.pokemon.name,
    trainedPokemonData.pokemon.nameEn,
    primaryType,
    secondaryType,
    trainedPokemonData.pokemon.baseHp,
    trainedPokemonData.pokemon.baseAttack,
    trainedPokemonData.pokemon.baseDefense,
    trainedPokemonData.pokemon.baseSpecialAttack,
    trainedPokemonData.pokemon.baseSpecialDefense,
    trainedPokemonData.pokemon.baseSpeed,
  );

  const ability = trainedPokemonData.ability
    ? new Ability(
        trainedPokemonData.ability.id,
        trainedPokemonData.ability.name,
        trainedPokemonData.ability.nameEn,
        trainedPokemonData.ability.description,
        trainedPokemonData.ability.triggerEvent as AbilityTrigger,
        trainedPokemonData.ability.effectCategory as AbilityCategory,
      )
    : null;

  return new TrainedPokemon(
    trainedPokemonData.id,
    trainedPokemonData.trainerId,
    pokemon,
    trainedPokemonData.nickname,
    trainedPokemonData.level,
    trainedPokemonData.gender as Gender | null,
    trainedPokemonData.nature as Nature | null,
    ability,
    trainedPokemonData.ivHp,
    trainedPokemonData.ivAttack,
    trainedPokemonData.ivDefense,
    trainedPokemonData.ivSpecialAttack,
    trainedPokemonData.ivSpecialDefense,
    trainedPokemonData.ivSpeed,
    trainedPokemonData.evHp,
    trainedPokemonData.evAttack,
    trainedPokemonData.evDefense,
    trainedPokemonData.evSpecialAttack,
    trainedPokemonData.evSpecialDefense,
    trainedPokemonData.evSpeed,
  );
}

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

    return trainerList.map(trainer => this.toTrainerEntity(trainer));
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
    return convertTrainedPokemonToEntity(trainedPokemonData);
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
      trainedPokemon: convertTrainedPokemonToEntity(member.trainedPokemon),
      position: member.position,
    }));
  }
}
