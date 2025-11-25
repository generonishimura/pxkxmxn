import { Module } from '@nestjs/common';
import { BATTLE_REPOSITORY_TOKEN } from './domain/battle.repository.interface';
import { BattlePrismaRepository } from './infrastructure/persistence/battle.prisma.repository';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { StartBattleUseCase } from './application/use-cases/start-battle.use-case';
import { ExecuteTurnUseCase } from './application/use-cases/execute-turn.use-case';
import { BattleController } from './infrastructure/battle.controller';
import { BattleGateway } from './infrastructure/battle.gateway';
import { TrainerModule } from '../trainer/trainer.module';
import { PokemonModule } from '../pokemon/pokemon.module';
import { ActionOrderDeterminerService } from './application/services/action-order-determiner.service';
import { WinnerCheckerService } from './application/services/winner-checker.service';
import { StatusConditionProcessorService } from './application/services/status-condition-processor.service';

/**
 * BattleModule
 * Battleモジュールの依存性注入設定
 */
@Module({
  imports: [PrismaModule, TrainerModule, PokemonModule],
  controllers: [BattleController],
  providers: [
    // ユースケース
    StartBattleUseCase,
    ExecuteTurnUseCase,

    // サービス
    ActionOrderDeterminerService,
    WinnerCheckerService,
    StatusConditionProcessorService,

    // ゲートウェイ
    BattleGateway,

    // リポジトリ（インターフェース → 具象実装のバインド）
    // 依存性逆転の原則: Domain層のインターフェースに、Infrastructure層の実装をバインド
    {
      provide: BATTLE_REPOSITORY_TOKEN,
      useClass: BattlePrismaRepository,
    },
  ],
  exports: [BATTLE_REPOSITORY_TOKEN, StartBattleUseCase, ExecuteTurnUseCase],
})
export class BattleModule {}
