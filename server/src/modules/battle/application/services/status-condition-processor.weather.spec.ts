import { StatusConditionProcessorService } from './status-condition-processor.service';
import { IBattleRepository } from '../../domain/battle.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Battle, BattleStatus, Weather, Field } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Nature } from '../../domain/logic/stat-calculator';

describe('StatusConditionProcessorService - ターン終了時の天候', () => {
  const battleId = 100;

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, battleId, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createTrainedPokemon = (id: number, abilityName: string): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(
        1,
        1,
        'ポケモン',
        'Pokemon',
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        50,
        50,
        50,
        50,
        50,
      ),
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      new Ability(
        id,
        abilityName,
        abilityName,
        'テスト用',
        AbilityTrigger.Passive,
        AbilityCategory.Other,
      ),
      31,
      31,
      31,
      31,
      31,
      31,
      0,
      0,
      0,
      0,
      0,
      0,
    );

  const setup = (opponentAbilityName: string) => {
    const statuses = [createStatus(1), createStatus(2)];
    const battleRepository: jest.Mocked<IBattleRepository> = {
      findById: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      findBattlePokemonStatusByBattleId: jest.fn().mockResolvedValue(statuses),
      createBattlePokemonStatus: jest.fn(),
      updateBattlePokemonStatus: jest.fn(),
      findActivePokemonByBattleIdAndTrainerId: jest.fn(),
      findBattlePokemonStatusById: jest.fn((id: number) =>
        Promise.resolve(statuses.find(s => s.id === id) ?? null),
      ),
      findBattlePokemonMovesByBattlePokemonStatusId: jest.fn(),
      createBattlePokemonMove: jest.fn(),
      updateBattlePokemonMove: jest.fn(),
      findBattlePokemonMoveById: jest.fn(),
    };
    const trainedPokemons = new Map([
      [1, createTrainedPokemon(1, 'テスト記録')],
      [2, createTrainedPokemon(2, opponentAbilityName)],
    ]);
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
      findByTrainerId: jest.fn(),
    };
    const captured: BattleContext[] = [];
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テスト記録', {
      onTurnEnd: (_p, ctx) => {
        if (ctx) captured.push(ctx);
      },
    });
    AbilityRegistry.register('テストてんき', { suppressesWeather: true });
    const service = new StatusConditionProcessorService(battleRepository, trainedPokemonRepository);
    const battle = new Battle(
      battleId,
      1,
      2,
      10,
      20,
      1,
      Weather.Rain,
      Field.None,
      BattleStatus.Active,
      null,
    );
    return { service, battle, captured };
  };

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('ターン終了時の特性に天候とフィールドを渡す', async () => {
    // Arrange
    const { service, battle, captured } = setup('いかく');

    // Act
    await service.processTurnEndAbilities(battle);

    // Assert
    expect(captured[0].weather).toBe(Weather.Rain);
    expect(captured[0].field).toBe(Field.None);
  });

  it('天候を消す特性が場にいると、天候なしを渡す', async () => {
    // Arrange
    const { service, battle, captured } = setup('テストてんき');

    // Act
    await service.processTurnEndAbilities(battle);

    // Assert
    expect(captured[0].weather).toBe(Weather.None);
  });
});
