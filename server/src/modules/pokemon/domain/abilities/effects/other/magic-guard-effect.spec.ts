import { MagicGuardEffect } from './magic-guard-effect';
import { AbilityRegistry } from '../../ability-registry';
import { applyIndirectDamage } from '../../../battle-events/indirect-damage';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('MagicGuardEffect（マジックガード）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('技以外のダメージと、与えたダメージに応じた反動を受けない', () => {
    // Arrange
    const effect = new MagicGuardEffect();

    // Act
    const flags = [effect.preventsIndirectDamage, effect.preventsRecoil];

    // Assert
    expect(flags).toEqual([true, true]);
  });

  it('持っているポケモンは applyIndirectDamage でHPが減らない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'マジックガード' });

    // Act
    const dealt = await applyIndirectDamage(get(1), 30, context());

    // Assert
    expect(dealt).toBe(0);
    expect(get(1).currentHp).toBe(100);
  });
});
