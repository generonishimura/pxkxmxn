import { GaleWingsEffect } from './gale-wings-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('GaleWingsEffect', () => {
  const createPokemon = (currentHp: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, currentHp, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (moveTypeName?: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName,
  });

  let effect: GaleWingsEffect;

  beforeEach(() => {
    effect = new GaleWingsEffect();
  });

  it('HPが満タンのとき、ひこう技の優先度を+1する', () => {
    // Arrange
    const pokemon = createPokemon(100);

    // Act
    const result = effect.modifyPriority(pokemon, 0, createCtx('ひこう'));

    // Assert
    expect(result).toBe(1);
  });

  it('もとの優先度に+1する（優先度-1のひこう技は0になる）', () => {
    // Arrange
    const pokemon = createPokemon(100);

    // Act
    const result = effect.modifyPriority(pokemon, -1, createCtx('ひこう'));

    // Assert
    expect(result).toBe(0);
  });

  it('HPが減っているときは変更しない', () => {
    // Arrange
    const pokemon = createPokemon(99);

    // Act
    const result = effect.modifyPriority(pokemon, 0, createCtx('ひこう'));

    // Assert
    expect(result).toBeUndefined();
  });

  it('ひこう以外の技は変更しない', () => {
    // Arrange
    const pokemon = createPokemon(100);

    // Act
    const result = effect.modifyPriority(pokemon, 0, createCtx('ノーマル'));

    // Assert
    expect(result).toBeUndefined();
  });

  it('コンテキストがない場合は変更しない', () => {
    // Arrange
    const pokemon = createPokemon(100);

    // Act
    const result = effect.modifyPriority(pokemon, 0, undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
