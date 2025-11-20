import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { PokemonController } from './infrastructure/pokemon.controller';
import { GetPokemonByIdUseCase } from './application/use-cases/get-pokemon-by-id.use-case';
import { GetAbilityEffectUseCase } from './application/use-cases/get-ability-effect.use-case';
import {
  PokemonPrismaRepository,
  AbilityPrismaRepository,
  MovePrismaRepository,
  TypeEffectivenessPrismaRepository,
} from './infrastructure/persistence/pokemon.prisma.repository';
import {
  POKEMON_REPOSITORY_TOKEN,
  ABILITY_REPOSITORY_TOKEN,
  MOVE_REPOSITORY_TOKEN,
  TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
} from './domain/pokemon.repository.interface';
import { PrismaModule } from '@/shared/prisma/prisma.module';
import { AbilityRegistry } from './domain/abilities/ability-registry';
import { MoveRegistry } from './domain/moves/move-registry';

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
    {
      provide: MOVE_REPOSITORY_TOKEN,
      useClass: MovePrismaRepository,
    },
    {
      provide: TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
      useClass: TypeEffectivenessPrismaRepository,
    },
  ],
  exports: [
    POKEMON_REPOSITORY_TOKEN,
    ABILITY_REPOSITORY_TOKEN,
    MOVE_REPOSITORY_TOKEN,
    TYPE_EFFECTIVENESS_REPOSITORY_TOKEN,
    GetPokemonByIdUseCase,
    GetAbilityEffectUseCase,
  ],
})
export class PokemonModule implements OnModuleInit {
  private readonly logger = new Logger(PokemonModule.name);

  /**
   * モジュール初期化時に特性レジストリと技のレジストリを初期化
   * 初期化に失敗した場合はアプリケーション起動を停止
   */
  onModuleInit() {
    try {
      this.logger.log('Initializing AbilityRegistry...');
      AbilityRegistry.initialize();
      const abilityCount = AbilityRegistry.listRegistered().length;
      this.logger.log(`AbilityRegistry initialized successfully. Registered ${abilityCount} abilities.`);

      this.logger.log('Initializing MoveRegistry...');
      MoveRegistry.initialize();
      const moveCount = MoveRegistry.listRegistered().length;
      this.logger.log(`MoveRegistry initialized successfully. Registered ${moveCount} moves.`);
    } catch (error) {
      this.logger.error('Failed to initialize registries', error);
      throw error;
    }
  }
}
