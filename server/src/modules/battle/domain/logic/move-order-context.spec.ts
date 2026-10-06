import { createMoveOrderContext, calculateBattleStats } from './move-order-context';
import { Battle, BattleStatus, Field, Weather } from '../entities/battle.entity';
import { BattlePokemonStatus } from '../entities/battle-pokemon-status.entity';
import { Move, MoveCategory } from '@/modules/pokemon/domain/entities/move.entity';
import { Type } from '@/modules/pokemon/domain/entities/type.entity';
import { Pokemon } from '@/modules/pokemon/domain/entities/pokemon.entity';
import { TrainedPokemon, Gender } from '@/modules/trainer/domain/entities/trained-pokemon.entity';
import { AbilityRegistry } from '@/modules/pokemon/domain/abilities/ability-registry';
import { Nature } from './stat-calculator';

describe('createMoveOrderContext', () => {
  const battle = new Battle(1, 1, 2, 1, 2, 1, Weather.Rain, Field.None, BattleStatus.Active, null);
  const status = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);
  const move = new Move(
    1,
    'いやしのはどう',
    'Heal Pulse',
    new Type(14, 'エスパー', 'Psychic'),
    MoveCategory.Status,
    null,
    null,
    10,
    0,
    null,
  );
  const stats = { attack: 1, defense: 2, specialAttack: 3, specialDefense: 4, speed: 5 };

  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストてんき', { suppressesWeather: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技名・タイプ・分類・優先度・フラグを入れる', () => {
    // Arrange & Act
    const context = createMoveOrderContext({ battle, move, pokemon: status });

    // Assert
    expect(context.moveName).toBe('いやしのはどう');
    expect(context.moveTypeName).toBe('エスパー');
    expect(context.moveCategory).toBe('Status');
    expect(context.movePriority).toBe(0);
    expect(context.moveFlags?.has('heal')).toBe(true);
  });

  it('行動するポケモン自身を attacker と attackerStats に入れる', () => {
    // Arrange & Act
    const context = createMoveOrderContext({ battle, move, pokemon: status, stats });

    // Assert
    expect(context.attacker).toBe(status);
    expect(context.attackerStats).toBe(stats);
  });

  it('天候を消す特性が場にいれば天候なしにする', () => {
    // Arrange & Act
    const context = createMoveOrderContext({
      battle,
      move,
      pokemon: status,
      abilityName: 'いかく',
      opponentAbilityName: 'テストてんき',
    });

    // Assert
    expect(context.weather).toBe(Weather.None);
    expect(context.attackerAbilityName).toBe('いかく');
    expect(context.defenderAbilityName).toBe('テストてんき');
  });
});

describe('calculateBattleStats', () => {
  it('育成ポケモンからランク補正前の実数値を計算する', () => {
    // Arrange
    const pokemon = new Pokemon(
      1,
      1,
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
    );
    const trainedPokemon = new TrainedPokemon(
      1,
      1,
      pokemon,
      null,
      50,
      Gender.Male,
      Nature.Hardy,
      null,
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
      252,
    );

    // Act
    const stats = calculateBattleStats(trainedPokemon);

    // Assert
    expect(stats).toEqual({
      attack: 120,
      defense: 120,
      specialAttack: 120,
      specialDefense: 120,
      speed: 152,
    });
  });
});
