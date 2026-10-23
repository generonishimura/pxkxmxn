import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { FieryWrathEffect } from './fiery-wrath-effect';

describe('FieryWrathEffect（もえあがるいかり）', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('20% に当たれば、相手をひるませる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.19);

    // Act
    const message = await new FieryWrathEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.flinched).toBe(true);
    expect(message).toBe('flinched!');
  });

  it('20% に外れれば、ひるませない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();
    jest.spyOn(Math, 'random').mockReturnValue(0.2);

    // Act
    const message = await new FieryWrathEffect().onHit(get(1), get(2), context());

    // Assert
    expect(get(2).volatileState.flinched).toBeUndefined();
    expect(message).toBeNull();
  });
});
