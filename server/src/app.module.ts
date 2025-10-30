import { Module } from '@nestjs/common';
import { PrismaModule } from './shared/prisma/prisma.module';
import { PokemonModule } from './modules/pokemon/pokemon.module';
import { BattleModule } from './modules/battle/battle.module';
import { TrainerModule } from './modules/trainer/trainer.module';

@Module({
  imports: [PrismaModule, PokemonModule, BattleModule, TrainerModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
