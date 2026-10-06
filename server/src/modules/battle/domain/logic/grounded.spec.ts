import { isGrounded } from './grounded';

describe('isGrounded', () => {
  it('ひこうタイプでもふゆうでもないポケモンは地面にいる', () => {
    // Act
    const grounded = isGrounded({ typeNames: ['ノーマル'], volatileState: {} });

    // Assert
    expect(grounded).toBe(true);
  });

  it('ひこうタイプは地面にいない', () => {
    // Act
    const grounded = isGrounded({ typeNames: ['ノーマル', 'ひこう'], volatileState: {} });

    // Assert
    expect(grounded).toBe(false);
  });

  it('ふゆうのポケモンは地面にいない', () => {
    // Act
    const grounded = isGrounded({
      typeNames: ['ゴースト'],
      abilityName: 'ふゆう',
      volatileState: {},
    });

    // Assert
    expect(grounded).toBe(false);
  });

  it.each([
    ['でんじふゆう', { magnetRiseTurns: 3 }],
    ['テレキネシス', { telekinesisTurns: 2 }],
  ])('%s で浮いているポケモンは地面にいない', (_name, volatileState) => {
    // Act
    const grounded = isGrounded({ typeNames: ['はがね'], volatileState });

    // Assert
    expect(grounded).toBe(false);
  });

  it('はねやすめをしたひこうタイプは、そのターンは地面にいる', () => {
    // Act
    const grounded = isGrounded({ typeNames: ['ひこう'], volatileState: { roosting: true } });

    // Assert
    expect(grounded).toBe(true);
  });

  it('ねをはっていると、ひこうタイプでも地面にいる', () => {
    // Act
    const grounded = isGrounded({ typeNames: ['ひこう'], volatileState: { ingrain: true } });

    // Assert
    expect(grounded).toBe(true);
  });

  it('じゅうりょくの間は、ひこうタイプ・ふゆう・でんじふゆうでも地面にいる', () => {
    // Act
    const grounded = isGrounded({
      typeNames: ['ひこう'],
      abilityName: 'ふゆう',
      volatileState: { magnetRiseTurns: 3 },
      sideState: { global: { gravityTurns: 3 } },
    });

    // Assert
    expect(grounded).toBe(true);
  });
});
