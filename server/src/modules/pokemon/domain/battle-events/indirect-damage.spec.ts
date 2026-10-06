import { AbilityRegistry } from '../abilities/ability-registry';
import { applyIndirectDamage, isIndirectDamagePrevented } from './indirect-damage';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('applyIndirectDamage（技以外のダメージ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストマジックガード', { preventsIndirectDamage: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('渡した状態のHPから指定した量を減らし、実際に減らしたHPを返す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { currentHp: 30 } });

    // Act
    const dealt = await applyIndirectDamage(get(1), 12, context());

    // Assert
    expect(dealt).toBe(12);
    expect(get(1).currentHp).toBe(18);
  });

  it('残りHPを超える分は減らさない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ status: { currentHp: 5 } });

    // Act
    const dealt = await applyIndirectDamage(get(1), 12, context());

    // Assert
    expect(dealt).toBe(5);
    expect(get(1).currentHp).toBe(0);
  });

  it('preventsIndirectDamage の特性を持つポケモンはダメージを受けない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({
      ability: 'テストマジックガード',
    });

    // Act
    const dealt = await applyIndirectDamage(get(1), 12, context());

    // Assert
    expect(dealt).toBe(0);
    expect(get(1).currentHp).toBe(100);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('すでにひんしのポケモンにはダメージを与えない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({ status: { currentHp: 0 } });

    // Act
    const dealt = await applyIndirectDamage(get(1), 12, context());

    // Assert
    expect(dealt).toBe(0);
    expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });

  it('コンテキストの特性名がわかれば、それで判定する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const prevented = await isIndirectDamagePrevented(
      get(1),
      context({ attacker: get(1), attackerAbilityName: 'テストマジックガード' }),
    );

    // Assert
    expect(prevented).toBe(true);
  });
});
