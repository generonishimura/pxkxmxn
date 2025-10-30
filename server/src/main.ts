import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as dotenv from 'dotenv';

// 環境変数を読み込む
dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // CORS設定（必要に応じて調整）
  app.enableCors({
    origin: true,
    credentials: true,
  });

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
