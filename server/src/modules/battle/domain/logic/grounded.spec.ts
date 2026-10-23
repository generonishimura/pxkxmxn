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
  describe('ふうせん（持ち物）', () => {
    it('ふうせんを持っているポケモンは地面にいない', () => {
      // Act
      const grounded = isGrounded({
        typeNames: ['ノーマル'],
        itemName: 'ふうせん',
        volatileState: {},
      });

      // Assert
      expect(grounded).toBe(false);
    });

    it('ふうせんを持っていても、ねをはっていると地面にいる', () => {
      // Act
      const grounded = isGrounded({
        typeNames: ['ノーマル'],
        itemName: 'ふうせん',
        volatileState: { ingrain: true },
      });

      // Assert
      expect(grounded).toBe(true);
    });

    it('ふうせんを持っていても、じゅうりょくの間は地面にいる', () => {
      // Act
      const grounded = isGrounded({
        typeNames: ['ノーマル'],
        itemName: 'ふうせん',
        volatileState: {},
        sideState: { global: { gravityTurns: 3 } },
      });

      // Assert
      expect(grounded).toBe(true);
    });

    it('ほかの持ち物では浮かない', () => {
      // Act
      const grounded = isGrounded({
        typeNames: ['ノーマル'],
        itemName: 'たべのこし',
        volatileState: {},
      });

      // Assert
      expect(grounded).toBe(true);
    });
  });
});
