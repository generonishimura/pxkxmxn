import { TruantEffect } from './truant-effect';
import { AbilityRegistry } from '../../ability-registry';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import {
  createBattleContext,
  createBattlePokemonStatus,
} from '@/modules/pokemon/domain/moves/effects/__tests__/test-helpers';

describe('TruantEffect（なまけ）', () => {
  const createRepository = (): jest.Mocked<IBattleRepository> =>
    ({ patchVolatileState: jest.fn() }) as Partial<
      jest.Mocked<IBattleRepository>
    > as jest.Mocked<IBattleRepository>;

  describe('onBeforeMove', () => {
    it('休みでないターンは技を出し、次のターンを休みにする', async () => {
      // Arrange
      const battleRepository = createRepository();
      const holder = createBattlePokemonStatus({ id: 1 });

      // Act
      const message = await new TruantEffect().onBeforeMove(
        holder,
        createBattleContext({ battleRepository }),
      );

      // Assert
      expect(message).toBeNull();
      expect(battleRepository.patchVolatileState).toHaveBeenCalledWith(1, { loafing: true });
    });

    it('休みのターンは技を出さず、次のターンは動けるようにする', async () => {
      // Arrange
      const battleRepository = createRepository();
      const holder = createBattlePokemonStatus({ id: 1, volatileState: { loafing: true } });

      // Act
      const message = await new TruantEffect().onBeforeMove(
        holder,
        createBattleContext({ battleRepository }),
      );

      // Assert
      expect(message).toBe('is loafing around!');
      expect(battleRepository.patchVolatileState).toHaveBeenCalledWith(1, { loafing: null });
    });
  });

  it('DB の特性名で登録されている', () => {
    // Arrange
    AbilityRegistry.clear();
    AbilityRegistry.initialize();

    // Act
    const effect = AbilityRegistry.get('なまけ');

    // Assert
    expect(effect).toBeInstanceOf(TruantEffect);
  });
});
