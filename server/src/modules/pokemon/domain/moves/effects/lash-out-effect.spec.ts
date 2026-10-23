import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { LashOutEffect } from './lash-out-effect';

describe('LashOutEffect（うっぷんばらし）', () => {
  it('このターンに使用者の能力ランクが下がっていたら、威力を 2 倍にする', () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statsLoweredTurn: 1 } },
    });
    const ctx = context({ movePower: 75 });

    // Act
    const power = new LashOutEffect().modifyMovePower(get(1), get(2), ctx);

    // Assert
    expect(ctx.battle.turn).toBe(1);
    expect(power).toBe(150);
  });

  it('下がったのが前のターンなら、威力は変えない', () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statsLoweredTurn: 0 } },
    });

    // Act
    const power = new LashOutEffect().modifyMovePower(get(1), get(2), context({ movePower: 75 }));

    // Assert
    expect(power).toBeUndefined();
  });

  it('このターンに上がっただけなら、威力は変えない', () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: { statsRaisedTurn: 1 } },
    });

    // Act
    const power = new LashOutEffect().modifyMovePower(get(1), get(2), context({ movePower: 75 }));

    // Assert
    expect(power).toBeUndefined();
  });

  it('威力を決める前に使用者の最新の状態を取り直させる（beforeDamage を持つ）', () => {
    // Arrange
    const effect = new LashOutEffect();

    // Act
    const hasBeforeDamage = typeof effect.beforeDamage === 'function';

    // Assert
    expect(hasBeforeDamage).toBe(true);
  });
});
