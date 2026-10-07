import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { SimpleBeamEffect } from './simple-beam-effect';

describe('SimpleBeamEffect（シンプルビーム）', () => {
  it('相手の特性をたんじゅんにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'ふみん' });

    // Act
    const message = await new SimpleBeamEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The target acquired たんじゅん!');
    expect(get(2).volatileState.abilityOverride).toBe('たんじゅん');
  });

  it.each([
    ['たんじゅん', 'たんじゅん'],
    ['なまけ', 'なまけ'],
    ['消せない特性（スワームチェンジ）', 'スワームチェンジ'],
  ])('相手の特性が%sなら失敗する', async (_label, ability) => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability });

    // Act
    const message = await new SimpleBeamEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
  });
});
