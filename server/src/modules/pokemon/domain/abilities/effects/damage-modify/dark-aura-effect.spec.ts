import { DarkAuraEffect } from './dark-aura-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('DarkAuraEffect', () => {
  const holder = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (overrides: Partial<BattleContext> = {}): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    moveTypeName: 'あく',
    moveCategory: 'Physical',
    attackerAbilityName: 'ダークオーラ',
    defenderAbilityName: 'いかく',
    ...overrides,
  });

  let effect: DarkAuraEffect;

  beforeEach(() => {
    effect = new DarkAuraEffect();
  });

  it('あく技の威力を5448/4096倍にする（80 → 106）', () => {
    // Act
    const result = effect.modifyAnyBasePower(holder, 80, createCtx());

    // Assert
    expect(result).toBe(106);
  });

  it('相手が使ったあく技の威力も上げる', () => {
    // Arrange
    const ctx = createCtx({ attackerAbilityName: 'いかく', defenderAbilityName: 'ダークオーラ' });

    // Act
    const result = effect.modifyAnyBasePower(holder, 80, ctx);

    // Assert
    expect(result).toBe(106);
  });

  it('オーラブレイクの相手がいると、あく技の威力を3072/4096倍にする（80 → 60）', () => {
    // Arrange
    const ctx = createCtx({ defenderAbilityName: 'オーラブレイク' });

    // Act
    const result = effect.modifyAnyBasePower(holder, 80, ctx);

    // Assert
    expect(result).toBe(60);
  });

  it('オーラブレイクのポケモンが使ったあく技も3072/4096倍にする', () => {
    // Arrange
    const ctx = createCtx({
      attackerAbilityName: 'オーラブレイク',
      defenderAbilityName: 'ダークオーラ',
    });

    // Act
    const result = effect.modifyAnyBasePower(holder, 80, ctx);

    // Assert
    expect(result).toBe(60);
  });

  it('あく以外の技は変更しない', () => {
    // Act
    const result = effect.modifyAnyBasePower(holder, 80, createCtx({ moveTypeName: 'ノーマル' }));

    // Assert
    expect(result).toBeUndefined();
  });

  it('変化技は変更しない', () => {
    // Act
    const result = effect.modifyAnyBasePower(holder, 80, createCtx({ moveCategory: 'Status' }));

    // Assert
    expect(result).toBeUndefined();
  });

  it('コンテキストがない場合は変更しない', () => {
    // Act
    const result = effect.modifyAnyBasePower(holder, 80, undefined);

    // Assert
    expect(result).toBeUndefined();
  });
});
