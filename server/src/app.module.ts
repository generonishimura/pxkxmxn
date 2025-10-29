import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/prisma/prisma.module';
import { PokemonModule } from './modules/pokemon/pokemon.module';

@Module({
  imports: [PrismaModule, PokemonModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
