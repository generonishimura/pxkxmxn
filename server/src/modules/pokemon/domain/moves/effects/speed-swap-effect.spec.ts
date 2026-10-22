import { SpeedSwapEffect } from './speed-swap-effect';
import { MoveRegistry } from '../move-registry';
import { BattleStatValues } from '../../abilities/battle-context.interface';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('SpeedSwapEffect（スピードスワップ）', () => {
  const stats = (overrides: Partial<BattleStatValues> = {}): BattleStatValues => ({
    attack: 100,
    defense: 100,
    specialAttack: 100,
    specialDefense: 100,
    speed: 100,
    ...overrides,
  });

  it('素早さの実数値を入れ替える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    const ctx = context({
      attackerStats: stats({ speed: 45 }),
      defenderStats: stats({ speed: 130 }),
    });

    // Act
    const message = await new SpeedSwapEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(1).volatileState.statOverrides).toEqual({ speed: 130 });
    expect(get(2).volatileState.statOverrides).toEqual({ speed: 45 });
    expect(message).toBe('switched Speed with its target!');
  });

  it('素早さのランクは入れ替えない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { status: { speedRank: 2 } },
      { status: { speedRank: -1 } },
    );
    const ctx = context({
      attackerStats: stats({ speed: 45 }),
      defenderStats: stats({ speed: 130 }),
    });

    // Act
    await new SpeedSwapEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(1).speedRank).toBe(2);
    expect(get(2).speedRank).toBe(-1);
  });

  it('ほかの実数値の上書きは残す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statOverrides: { defense: 120 } } },
    });
    const ctx = context({
      attackerStats: stats({ defense: 120, speed: 45 }),
      defenderStats: stats({ speed: 130 }),
    });

    // Act
    await new SpeedSwapEffect().onUse(get(1), get(2), ctx);

    // Assert
    expect(get(1).volatileState.statOverrides).toEqual({ defense: 120, speed: 130 });
  });

  it('実数値がコンテキストになければ、失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new SpeedSwapEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.statOverrides).toBeUndefined();
    expect(message).toBe('But it failed');
  });

  it('MoveRegistry に「スピードスワップ」として登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('スピードスワップ');

    // Assert
    expect(effect).toBeInstanceOf(SpeedSwapEffect);
  });
});
