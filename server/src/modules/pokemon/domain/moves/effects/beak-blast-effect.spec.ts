import { BeakBlastEffect } from './beak-blast-effect';
import { MoveRegistry } from '../move-registry';
import { IBattleRepository } from '@/modules/battle/domain/battle.repository.interface';
import { createBattleContext, createBattlePokemonStatus } from './__tests__/test-helpers';

describe('BeakBlastEffect（くちばしキャノン）', () => {
  it('ターンの初めに、くちばしを加熱する', async () => {
    // Arrange
    const user = createBattlePokemonStatus({ id: 1 });
    const opponent = createBattlePokemonStatus({ id: 2 });
    const battleRepository = { patchVolatileState: jest.fn() } as Partial<
      jest.Mocked<IBattleRepository>
    > as jest.Mocked<IBattleRepository>;

    // Act
    const message = await new BeakBlastEffect().onTurnStart(
      user,
      opponent,
      createBattleContext({ battleRepository }),
    );

    // Assert
    expect(battleRepository.patchVolatileState).toHaveBeenCalledWith(1, { beakBlast: true });
    expect(message).toBe('started heating up its beak!');
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('くちばしキャノン');

    // Assert
    expect(effect).toBeInstanceOf(BeakBlastEffect);
  });
});
