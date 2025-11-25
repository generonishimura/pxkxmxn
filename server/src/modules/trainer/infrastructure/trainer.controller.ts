import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { CreateTrainerUseCase } from '../application/use-cases/trainer.use-cases';
import { GetTrainerByIdUseCase } from '../application/use-cases/trainer.use-cases';
import { UpdateTrainerUseCase } from '../application/use-cases/trainer.use-cases';
import { DeleteTrainerUseCase } from '../application/use-cases/trainer.use-cases';
import { GetAllTrainersUseCase } from '../application/use-cases/trainer.use-cases';
import { Trainer } from '../domain/entities/trainer.entity';
import { CreateTrainerDto } from './dto/create-trainer.dto';
import { UpdateTrainerDto } from './dto/update-trainer.dto';

/**
 * TrainerController
 * TrainerモジュールのHTTPエンドポイント
 */
@Controller('trainers')
export class TrainerController {
  constructor(
    private readonly createTrainerUseCase: CreateTrainerUseCase,
    private readonly getTrainerByIdUseCase: GetTrainerByIdUseCase,
    private readonly updateTrainerUseCase: UpdateTrainerUseCase,
    private readonly deleteTrainerUseCase: DeleteTrainerUseCase,
    private readonly getAllTrainersUseCase: GetAllTrainersUseCase,
  ) {}

  /**
   * トレーナーを作成
   */
  @Post()
  async create(@Body() data: CreateTrainerDto): Promise<Trainer> {
    return await this.createTrainerUseCase.execute(data);
  }

  /**
   * IDでトレーナーを取得
   */
  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number): Promise<Trainer | null> {
    return await this.getTrainerByIdUseCase.execute(id);
  }

  /**
   * すべてのトレーナーを取得
   */
  @Get()
  async findAll(): Promise<Trainer[]> {
    return await this.getAllTrainersUseCase.execute();
  }

  /**
   * トレーナーを更新
   */
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() data: UpdateTrainerDto,
  ): Promise<Trainer> {
    return await this.updateTrainerUseCase.execute(id, data);
  }

  /**
   * トレーナーを削除
   */
  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return await this.deleteTrainerUseCase.execute(id);
  }
}

