import { Module } from '@nestjs/common';
import { PokemonController } from './infrastructure/pokemon.controller';
import { GetPokemonByIdUseCase } from './application/use-cases/get-pokemon-by-id.use-case';
import { GetAbilityEffectUseCase } from './application/use-cases/get-ability-effect.use-case';
import {
  PokemonPrismaRepository,
  AbilityPrismaRepository,
} from './infrastructure/persistence/pokemon.prisma.repository';
import {
  POKEMON_REPOSITORY_TOKEN,
  ABILITY_REPOSITORY_TOKEN,
} from './domain/pokemon.repository.interface';
import { PrismaModule } from '../../shared/prisma/prisma.module';
import { AbilityRegistry } from './domain/abilities/ability-registry';

/**
 * PokemonModule
 * Pokemonモジュールの依存性注入設定
 */
@Module({
  imports: [PrismaModule],
  controllers: [PokemonController],
  providers: [
    // ユースケース
    GetPokemonByIdUseCase,
    GetAbilityEffectUseCase,

    // リポジトリ（インターフェース → 具象実装のバインド）
    // 依存性逆転の原則: Domain層のインターフェースに、Infrastructure層の実装をバインド
    {
      provide: POKEMON_REPOSITORY_TOKEN,
      useClass: PokemonPrismaRepository,
    },
    {
      provide: ABILITY_REPOSITORY_TOKEN,
      useClass: AbilityPrismaRepository,
    },

    // Prismaリポジトリ実装も直接提供（必要に応じて使用可能）
    PokemonPrismaRepository,
    AbilityPrismaRepository,
  ],
  exports: [GetPokemonByIdUseCase, GetAbilityEffectUseCase],
})
export class PokemonModule {
  /**
   * モジュール初期化時に特性レジストリを初期化
   */
  constructor() {
    AbilityRegistry.initialize();
  }
}
