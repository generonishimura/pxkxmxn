import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { RageFistEffect } from './rage-fist-effect';

describe('RageFistEffect（ふんどのこぶし）', () => {
  it.each([
    [undefined, 50],
    [1, 100],
    [3, 200],
    [6, 350],
    [7, 350],
  ])('攻撃を受けた回数が %s なら、威力は %s（50 + 50 × 回数、最大 350）', (times, expected) => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      status: { volatileState: times === undefined ? {} : { timesAttacked: times } },
    });

    // Act
    const power = new RageFistEffect().modifyMovePower(get(1), get(2), context({ movePower: 50 }));

    // Assert
    expect(power).toBe(expected);
  });

  it('威力を決める前に使用者の最新の状態を取り直させる（beforeDamage を持つ）', () => {
    // Arrange
    const effect = new RageFistEffect();

    // Act
    const hasBeforeDamage = typeof effect.beforeDamage === 'function';

    // Assert
    expect(hasBeforeDamage).toBe(true);
  });
});
