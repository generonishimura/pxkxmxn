import { WonderGuardEffect } from './wonder-guard-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('WonderGuardEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 1, 1, 0, 0, 0, 0, 0, 0, 0, null);
  const battle = new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null);
  const createCtx = (overrides?: Partial<BattleContext>): BattleContext => ({
    battle,
    moveName: 'テスト技',
    moveCategory: 'Physical',
    ...overrides,
  });

  let effect: WonderGuardEffect;

  beforeEach(() => {
    effect = new WonderGuardEffect();
  });

  it('効果ばつぐんの技は無効にしない', () => {
    // Arrange
    const ctx = createCtx({ typeEffectiveness: 2 });

    // Act
    const result = effect.isImmuneToType(pokemon, 'ほのお', ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('4倍の技は無効にしない', () => {
    // Arrange
    const ctx = createCtx({ typeEffectiveness: 4 });

    // Act
    const result = effect.isImmuneToType(pokemon, 'いわ', ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('等倍の技は無効にする', () => {
    // Arrange
    const ctx = createCtx({ typeEffectiveness: 1 });

    // Act
    const result = effect.isImmuneToType(pokemon, 'みず', ctx);

    // Assert
    expect(result).toBe(true);
  });

  it('いまひとつの技は無効にする', () => {
    // Arrange
    const ctx = createCtx({ typeEffectiveness: 0.5 });

    // Act
    const result = effect.isImmuneToType(pokemon, 'くさ', ctx);

    // Assert
    expect(result).toBe(true);
  });

  it('わるあがきは無効にしない', () => {
    // Arrange
    const ctx = createCtx({ moveName: 'わるあがき', typeEffectiveness: 1 });

    // Act
    const result = effect.isImmuneToType(pokemon, 'ノーマル', ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('タイプ相性が分からない場合は無効にしない', () => {
    // Arrange
    const ctx = createCtx();

    // Act
    const result = effect.isImmuneToType(pokemon, 'みず', ctx);

    // Assert
    expect(result).toBe(false);
  });

  it('コンテキストが無い場合は無効にしない', () => {
    // Act
    const result = effect.isImmuneToType(pokemon, 'みず', undefined);

    // Assert
    expect(result).toBe(false);
  });
});
