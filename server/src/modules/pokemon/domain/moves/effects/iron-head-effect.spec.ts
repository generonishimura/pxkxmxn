import { IronHeadEffect } from './iron-head-effect';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';

describe('IronHeadEffect', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('乱数が 0.2 未満なら、相手をひるませる（チャンピオンズは 20%。SV は 30%）', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.19);
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new IronHeadEffect().onHit(
      get(1),
      get(2),
      context({ attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(message).toBe('flinched!');
  });

  it('乱数が 0.2 以上なら、相手はひるまない', async () => {
    // Arrange
    jest.spyOn(Math, 'random').mockReturnValue(0.2);
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new IronHeadEffect().onHit(
      get(1),
      get(2),
      context({ attacker: get(1), defender: get(2) }),
    );

    // Assert
    expect(message).toBeNull();
  });
});
