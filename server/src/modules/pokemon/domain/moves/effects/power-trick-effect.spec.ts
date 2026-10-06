import { PowerTrickEffect } from './power-trick-effect';
import { createStatefulMoveContext, createStatus } from './__tests__/stateful-move-context';

describe('PowerTrickEffect（パワートリック）', () => {
  const stats = { attack: 120, defense: 80, specialAttack: 60, specialDefense: 70, speed: 90 };

  it('攻撃と防御の実数値を入れ替える', async () => {
    // Arrange
    const effect = new PowerTrickEffect();
    const attacker = createStatus({ id: 1 });
    const defender = createStatus({ id: 2 });
    const { ctx, latest } = createStatefulMoveContext({
      attacker,
      defender,
      attackerStats: stats,
    });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.statOverrides).toEqual({ attack: 80, defense: 120 });
    expect(message).toBe('switched its Attack and Defense!');
  });

  it('もう一度使うと、入れ替えた実数値が元に戻る', async () => {
    // Arrange: 1 回目で入れ替え済み（コンテキストの実数値は上書きを反映した値）
    const effect = new PowerTrickEffect();
    const attacker = createStatus({
      id: 1,
      volatileState: { statOverrides: { attack: 80, defense: 120 } },
    });
    const defender = createStatus({ id: 2 });
    const { ctx, latest } = createStatefulMoveContext({
      attacker,
      defender,
      attackerStats: { ...stats, attack: 80, defense: 120 },
    });

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.statOverrides).toEqual({ attack: 120, defense: 80 });
  });

  it('ほかの実数値の上書き（パワーシェアの特攻など）は残す', async () => {
    // Arrange
    const effect = new PowerTrickEffect();
    const attacker = createStatus({
      id: 1,
      volatileState: { statOverrides: { specialAttack: 65 } },
    });
    const defender = createStatus({ id: 2 });
    const { ctx, latest } = createStatefulMoveContext({
      attacker,
      defender,
      attackerStats: { ...stats, specialAttack: 65 },
    });

    // Act
    await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.statOverrides).toEqual({
      specialAttack: 65,
      attack: 80,
      defense: 120,
    });
  });

  it('実数値がわからないときは何もしない', async () => {
    // Arrange
    const effect = new PowerTrickEffect();
    const attacker = createStatus({ id: 1 });
    const defender = createStatus({ id: 2 });
    const { ctx, latest } = createStatefulMoveContext({ attacker, defender });

    // Act
    const message = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(latest(1).volatileState.statOverrides).toBeUndefined();
    expect(message).toBeNull();
  });
});
