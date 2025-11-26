import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { DomainExceptionFilter } from './shared/infrastructure/filters/domain-exception.filter';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  // グローバル例外フィルターを登録
  app.useGlobalFilters(new DomainExceptionFilter());

  // グローバルバリデーションパイプを登録
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // DTOに定義されていないプロパティを除外
      forbidNonWhitelisted: true, // DTOに定義されていないプロパティがある場合エラー
      transform: true, // リクエストボディをDTOクラスのインスタンスに変換
      transformOptions: {
        enableImplicitConversion: true, // 型変換を有効化
      },
    }),
  );

  // CORS設定（必要に応じて調整）
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  logger.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
