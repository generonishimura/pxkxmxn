import { DiveEffect } from './dive-effect';
import { MoveRegistry } from '../move-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('DiveEffect（ダイビング）', () => {
  const CRAMORANT = 845;

  describe('chargeTurn.onCharge', () => {
    it('うのミサイルのウッウがもぐるとき、HPが半分より多ければ、うのみのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT, status: { currentHp: 100, maxHp: 100 } },
        {},
      );

      // Act
      const message = await new DiveEffect().chargeTurn.onCharge(
        get(1),
        get(2),
        context({ attackerAbilityName: 'うのミサイル' }),
      );

      // Assert
      expect(message).toBeNull();
      expect(get(1).volatileState.form).toBe('gulping');
    });

    it('うのミサイルのウッウがもぐるとき、HPが半分以下なら、まるのみのすがたになる', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT, status: { currentHp: 50, maxHp: 100 } },
        {},
      );

      // Act
      await new DiveEffect().chargeTurn.onCharge(
        get(1),
        get(2),
        context({ attackerAbilityName: 'うのミサイル' }),
      );

      // Assert
      expect(get(1).volatileState.form).toBe('gorging');
    });

    it('うのミサイルが効いていなければ、フォルムを変えない', async () => {
      // Arrange
      const { context, get } = createInMemoryBattle(
        { ability: 'うのミサイル', nationalDex: CRAMORANT },
        {},
      );

      // Act
      await new DiveEffect().chargeTurn.onCharge(get(1), get(2), context());

      // Assert
      expect(get(1).volatileState.form).toBeUndefined();
    });
  });

  it('MoveRegistryに「ダイビング」として登録されている', () => {
    // Arrange
    MoveRegistry.clear();
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('ダイビング');

    // Assert
    expect(effect).toBeInstanceOf(DiveEffect);
  });
});
