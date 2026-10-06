import { LiquidOozeEffect } from './liquid-ooze-effect';
import { AbilityRegistry } from '../../ability-registry';
import { applyDrainHeal } from '../../../battle-events/drain-heal';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

describe('LiquidOozeEffect（ヘドロえき）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('HPを吸い取った相手を回復させず、同じ量のダメージを与える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { currentHp: 70 } },
      { ability: 'ヘドロえき' },
    );

    // Act
    const result = await applyDrainHeal(get(1), get(2), 25, context());

    // Assert
    expect(result).toEqual({ healed: 0, damaged: 25 });
    expect(get(1).currentHp).toBe(45);
  });

  it('吸い取った側がかたやぶりでも、無視されない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'かたやぶり', status: { currentHp: 70 } },
      { ability: 'ヘドロえき' },
    );

    // Act
    const result = await applyDrainHeal(
      get(1),
      get(2),
      25,
      context({ attacker: get(1), attackerAbilityName: 'かたやぶり' }),
    );

    // Assert
    expect(result).toEqual({ healed: 0, damaged: 25 });
  });

  it('DB の特性名で登録されている', () => {
    // Act
    const effect = AbilityRegistry.get('ヘドロえき');

    // Assert
    expect(effect).toBeInstanceOf(LiquidOozeEffect);
    expect(effect?.reversesDrainHeal).toBe(true);
  });
});
