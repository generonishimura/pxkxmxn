import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { PowerShiftEffect } from './power-shift-effect';

describe('PowerShiftEffect（パワーシフト）', () => {
  const stats = { attack: 120, defense: 80, specialAttack: 90, specialDefense: 70, speed: 60 };

  it('自分の攻撃と防御の実数値を入れ替える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const effect = new PowerShiftEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context({ attackerStats: stats }));

    // Assert
    expect(message).toBe('switched its Attack and Defense!');
    expect(get(1).volatileState.statOverrides).toEqual({ attack: 80, defense: 120 });
  });

  it('ほかの能力の上書きは残す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statOverrides: { speed: 100 } } },
    });
    const effect = new PowerShiftEffect();

    // Act
    await effect.onUse(get(1), get(2), context({ attackerStats: { ...stats, speed: 100 } }));

    // Assert
    expect(get(1).volatileState.statOverrides).toEqual({ attack: 80, defense: 120, speed: 100 });
  });

  it('もう一度使うと元の実数値に戻る', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statOverrides: { attack: 80, defense: 120 } } },
    });
    const effect = new PowerShiftEffect();

    // Act
    await effect.onUse(
      get(1),
      get(2),
      context({ attackerStats: { ...stats, attack: 80, defense: 120 } }),
    );

    // Assert
    expect(get(1).volatileState.statOverrides).toEqual({ attack: 120, defense: 80 });
  });

  it('実数値がわからなければ失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    const effect = new PowerShiftEffect();

    // Act
    const message = await effect.onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(battleRepository.patchVolatileState).not.toHaveBeenCalled();
  });
});
