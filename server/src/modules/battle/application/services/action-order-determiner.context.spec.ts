import { ActionOrderDeterminerService } from './action-order-determiner.service';
import { ActionOrderDeterminer } from '../../domain/logic/action-order-determiner';
import { Battle, BattleStatus, Field, Weather } from '../../domain/entities/battle.entity';
import { BattlePokemonStatus } from '../../domain/entities/battle-pokemon-status.entity';
import { Nature } from '../../domain/logic/stat-calculator';
import { IMoveRepository } from '@/modules/pokemon/domain/pokemon.repository.interface';
import { ITrainedPokemonRepository } from '@/modules/trainer/domain/trainer.repository.interface';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import {
  Ability,
  AbilityCategory,
  AbilityTrigger,
} from '@/modules/pokemon/domain/entities/ability.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';

type Determiner = Pick<ActionOrderDeterminerService, 'determine'>;

describe.each([
  [
    'ActionOrderDeterminerService',
    (m: IMoveRepository, t: ITrainedPokemonRepository): Determiner =>
      new ActionOrderDeterminerService(m, t),
  ],
  [
    'ActionOrderDeterminer',
    (m: IMoveRepository, t: ITrainedPokemonRepository): Determiner =>
      new ActionOrderDeterminer(m, t),
  ],
])('%s - 行動順の特性フックに渡すコンテキスト', (_name, createDeterminer) => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, Field.None, BattleStatus.Active, null);

  const createStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createTrainedPokemon = (id: number, abilityName: string): TrainedPokemon =>
    new TrainedPokemon(
      id,
      id,
      new Pokemon(
        id,
        id,
        'テスト',
        'Test',
        new Type(1, 'ノーマル', 'Normal'),
        null,
        100,
        100,
        100,
        100,
        100,
        100,
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

  const flyingMove = new Move(
    1,
    'つばめがえし',
    'Aerial Ace',
    new Type(3, 'ひこう', 'Flying'),
    MoveCategory.Physical,
    60,
    null,
    20,
    0,
    null,
  );
  const statusMove = new Move(
    2,
    'なきごえ',
    'Growl',
    new Type(1, 'ノーマル', 'Normal'),
    MoveCategory.Status,
    null,
    100,
    40,
    0,
    null,
  );

  const setup = (opponentAbilityName: string) => {
    const moves = new Map([
      [1, flyingMove],
      [2, statusMove],
    ]);
    const moveRepository: jest.Mocked<IMoveRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(moves.get(id) ?? null)),
      findByPokemonId: jest.fn(),
    };
    const trainedPokemons = new Map([
      [1, createTrainedPokemon(1, 'テスト記録')],
      [2, createTrainedPokemon(2, opponentAbilityName)],
    ]);
    const trainedPokemonRepository: jest.Mocked<ITrainedPokemonRepository> = {
      findById: jest.fn((id: number) => Promise.resolve(trainedPokemons.get(id) ?? null)),
      findByTrainerId: jest.fn(),
    };
    const priorityContexts: BattleContext[] = [];
    const speedContexts: BattleContext[] = [];
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テスト記録', {
      modifyPriority: (_p, priority, ctx) => {
        if (ctx) priorityContexts.push(ctx);
        return priority;
      },
      modifySpeed: (_p, speed, ctx) => {
        if (ctx) speedContexts.push(ctx);
        return speed;
      },
    });
    AbilityRegistry.register('テストてんき', { suppressesWeather: true });
    const determiner = createDeterminer(moveRepository, trainedPokemonRepository);
    return { determiner, priorityContexts, speedContexts };
  };

  const params = {
    battle,
    trainer1Action: { trainerId: 1, moveId: 1 },
    trainer2Action: { trainerId: 2, moveId: 2 },
    trainer1Active: createStatus(1),
    trainer2Active: createStatus(2),
  };

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('modifyPriority に自分の技の名前・タイプ・分類・フラグが渡される', async () => {
    // Arrange
    const { determiner, priorityContexts } = setup('いかく');

    // Act
    await determiner.determine(params);

    // Assert
    expect(priorityContexts[0].moveName).toBe('つばめがえし');
    expect(priorityContexts[0].moveTypeName).toBe('ひこう');
    expect(priorityContexts[0].moveCategory).toBe('Physical');
    expect(priorityContexts[0].moveFlags?.has('contact')).toBe(true);
  });

  it('modifySpeed に自分の実数値と効果のある天候が渡される', async () => {
    // Arrange
    const { determiner, speedContexts } = setup('テストてんき');

    // Act
    await determiner.determine(params);

    // Assert
    expect(speedContexts[0].attackerStats?.speed).toBe(120);
    expect(speedContexts[0].weather).toBe(Weather.None);
  });
});
