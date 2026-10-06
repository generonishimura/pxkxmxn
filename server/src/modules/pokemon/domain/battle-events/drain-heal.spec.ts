import { AbilityRegistry } from '../abilities/ability-registry';
import { applyDrainHeal, calculateDrainAmount } from './drain-heal';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('吸収技の回復', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    AbilityRegistry.register('テストヘドロえき', { reversesDrainHeal: true });
    AbilityRegistry.register('テストマジックガード', { preventsIndirectDamage: true });
  });

  afterEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  describe('calculateDrainAmount', () => {
    it.each([
      [100, 0.5, 50],
      [45, 0.5, 23],
      [1, 0.5, 1],
      [10, 0.75, 8],
      [0, 0.5, 0],
    ])(
      '与えたダメージ %i の %f 倍を四捨五入する（1以上なら最低1）→ %i',
      (damage, ratio, expected) => {
        // Act
        const amount = calculateDrainAmount(damage, ratio);

        // Assert
        expect(amount).toBe(expected);
      },
    );
  });

  describe('applyDrainHeal', () => {
    it('吸い取った量だけ回復する（最大HPを超えない）', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle({ status: { currentHp: 70 } });

      // Act
      const result = await applyDrainHeal(get(1), get(2), 50, context());

      // Assert
      expect(result).toEqual({ healed: 30, damaged: 0 });
      expect(get(1).currentHp).toBe(100);
    });

    it('吸い取られた側が reversesDrainHeal の特性なら、回復せずに同じ量のダメージを受ける', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { status: { currentHp: 70 } },
        { ability: 'テストヘドロえき' },
      );

      // Act
      const result = await applyDrainHeal(get(1), get(2), 20, context());

      // Assert
      expect(result).toEqual({ healed: 0, damaged: 20 });
      expect(get(1).currentHp).toBe(50);
    });

    it('ヘドロえきのダメージは、技以外のダメージを受けない特性で防がれる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'テストマジックガード', status: { currentHp: 70 } },
        { ability: 'テストヘドロえき' },
      );

      // Act
      const result = await applyDrainHeal(get(1), get(2), 20, context());

      // Assert
      expect(result).toEqual({ healed: 0, damaged: 0 });
      expect(get(1).currentHp).toBe(70);
    });

    it('ひんしのポケモンは回復しない', async () => {
      // Arrange
      const { context, get, battleRepository } = createInMemoryBattle({
        status: { currentHp: 0 },
      });

      // Act
      const result = await applyDrainHeal(get(1), get(2), 20, context());

      // Assert
      expect(result).toEqual({ healed: 0, damaged: 0 });
      expect(battleRepository.updateBattlePokemonStatus).not.toHaveBeenCalled();
    });
  });
});
