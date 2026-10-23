import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { MoonblastEffect } from './moonblast-effect';

describe('MoonblastEffect（ムーンフォース）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('10% に当たれば、相手の特攻を 1 段階下げる（チャンピオンズの確率）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.09);

    // Act
    const message = await new MoonblastEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).specialAttackRank).toBe(-1);
    expect(message).toBe('Special Attack fell!');
  });

  it('10% に外れれば、相手の特攻は下がらない（SV の 30% ではない）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.1);

    // Act
    const message = await new MoonblastEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).specialAttackRank).toBe(0);
    expect(message).toBeNull();
  });
});
