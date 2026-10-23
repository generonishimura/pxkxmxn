import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ShelterEffect } from './shelter-effect';

describe('ShelterEffect（たてこもる）', () => {
  it('自分の防御を 2 段階上げる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new ShelterEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).defenseRank).toBe(2);
    expect(get(2).defenseRank).toBe(0);
    expect(message).toBe('Defense rose!');
  });
});
