import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@generated/prisma/client';

/**
 * PrismaService
 * Prisma ClientをNest.jsのDIコンテナに統合するサービス
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  /**
   * モジュール初期化時にPrisma Clientを接続
   */
  async onModuleInit() {
    await this.$connect();
  }

  /**
   * モジュール終了時にPrisma Clientを切断
   */
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
