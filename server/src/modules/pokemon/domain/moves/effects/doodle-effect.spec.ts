import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { DoodleEffect } from './doodle-effect';

describe('DoodleEffect（うつしえ）', () => {
  it('使用者の特性を相手の今の特性にする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'ふみん' }, { ability: 'たんじゅん' });

    // Act
    const message = await new DoodleEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user copied たんじゅん!');
    expect(get(1).volatileState.abilityOverride).toBe('たんじゅん');
  });

  it.each([
    ['相手の特性が写せない特性（トレース）', { ability: 'ふみん' }, { ability: 'トレース' }],
    ['相手と同じ特性', { ability: 'たんじゅん' }, { ability: 'たんじゅん' }],
    [
      '使用者の特性が消せない特性（ＡＲシステム）',
      { ability: 'ＡＲシステム' },
      { ability: 'たんじゅん' },
    ],
    ['相手に特性がない', { ability: 'ふみん' }, {}],
  ])('%sなら失敗する', async (_label, first, second) => {
    // Arrange
    const { context, get } = createInMemoryBattle(first, second);

    // Act
    const message = await new DoodleEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
  });
});
