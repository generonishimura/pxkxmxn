import { Injectable, Inject } from '@nestjs/common';
import {
  ITrainerRepository,
  TRAINER_REPOSITORY_TOKEN,
} from '../../domain/trainer.repository.interface';
import { Trainer } from '../../domain/entities/trainer.entity';

/**
 * Trainer作成ユースケース
 */
@Injectable()
export class CreateTrainerUseCase {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN)
    private readonly trainerRepository: ITrainerRepository,
  ) {}

  async execute(data: { name: string; email?: string }): Promise<Trainer> {
    return await this.trainerRepository.create(data);
  }
}

/**
 * Trainer取得ユースケース
 */
@Injectable()
export class GetTrainerByIdUseCase {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN)
    private readonly trainerRepository: ITrainerRepository,
  ) {}

  async execute(id: number): Promise<Trainer | null> {
    return await this.trainerRepository.findById(id);
  }
}

/**
 * Trainer更新ユースケース
 */
@Injectable()
export class UpdateTrainerUseCase {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN)
    private readonly trainerRepository: ITrainerRepository,
  ) {}

  async execute(id: number, data: Partial<Trainer>): Promise<Trainer> {
    return await this.trainerRepository.update(id, data);
  }
}

/**
 * Trainer削除ユースケース
 */
@Injectable()
export class DeleteTrainerUseCase {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN)
    private readonly trainerRepository: ITrainerRepository,
  ) {}

  async execute(id: number): Promise<void> {
    return await this.trainerRepository.delete(id);
  }
}

/**
 * Trainer一覧取得ユースケース
 */
@Injectable()
export class GetAllTrainersUseCase {
  constructor(
    @Inject(TRAINER_REPOSITORY_TOKEN)
    private readonly trainerRepository: ITrainerRepository,
  ) {}

  async execute(): Promise<Trainer[]> {
    return await this.trainerRepository.findAll();
  }
}

