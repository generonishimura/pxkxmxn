import { Module } from '@nestjs/common';
import {
  IBattleRepository,
  BATTLE_REPOSITORY_TOKEN,
} from './domain/battle.repository.interface';
import { BattlePrismaRepository } from './infrastructure/persistence/battle.prisma.repository';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { StartBattleUseCase } from './application/use-cases/start-battle.use-case';
import { ExecuteTurnUseCase } from './application/use-cases/execute-turn.use-case';
import { BattleController } from './infrastructure/battle.controller';
import { BattleGateway } from './infrastructure/battle.gateway';

/**
 * BattleModule
 * Battleモジュールの依存性注入設定
 */
@Module({
  imports: [PrismaModule],
  controllers: [BattleController],
  providers: [
    // ユースケース
    StartBattleUseCase,
    ExecuteTurnUseCase,

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

