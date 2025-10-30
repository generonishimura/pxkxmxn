import { Module } from '@nestjs/common';
import { TrainerController } from './infrastructure/trainer.controller';
import {
  CreateTrainerUseCase,
  GetTrainerByIdUseCase,
  UpdateTrainerUseCase,
  DeleteTrainerUseCase,
  GetAllTrainersUseCase,
} from './application/use-cases/trainer.use-cases';
import {
  TrainerPrismaRepository,
  TrainedPokemonPrismaRepository,
  TeamPrismaRepository,
} from './infrastructure/persistence/trainer.prisma.repository';
import {
  TRAINER_REPOSITORY_TOKEN,
  TRAINED_POKEMON_REPOSITORY_TOKEN,
  TEAM_REPOSITORY_TOKEN,
} from './domain/trainer.repository.interface';
import { PrismaModule } from '@/shared/prisma/prisma.module';

/**
 * TrainerModule
 * Trainerモジュールの依存性注入設定
 */
@Module({
  imports: [PrismaModule],
  controllers: [TrainerController],
  providers: [
    // ユースケース
    CreateTrainerUseCase,
    GetTrainerByIdUseCase,
    UpdateTrainerUseCase,
    DeleteTrainerUseCase,
    GetAllTrainersUseCase,

    // リポジトリ（インターフェース → 具象実装のバインド）
    // 依存性逆転の原則: Domain層のインターフェースに、Infrastructure層の実装をバインド
    {
      provide: TRAINER_REPOSITORY_TOKEN,
      useClass: TrainerPrismaRepository,
    },
    {
      provide: TRAINED_POKEMON_REPOSITORY_TOKEN,
      useClass: TrainedPokemonPrismaRepository,
    },
    {
      provide: TEAM_REPOSITORY_TOKEN,
      useClass: TeamPrismaRepository,
    },
  ],
  exports: [
    TRAINER_REPOSITORY_TOKEN,
    TRAINED_POKEMON_REPOSITORY_TOKEN,
    TEAM_REPOSITORY_TOKEN,
    CreateTrainerUseCase,
    GetTrainerByIdUseCase,
    UpdateTrainerUseCase,
    DeleteTrainerUseCase,
    GetAllTrainersUseCase,
  ],
})
export class TrainerModule {}
