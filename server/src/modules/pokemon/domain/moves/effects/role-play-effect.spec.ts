import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { RolePlayEffect } from './role-play-effect';

describe('RolePlayEffect（なりきり）', () => {
  it('使用者の特性を相手の今の特性にする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん' },
      { ability: 'ふみん', status: { volatileState: { abilityOverride: 'たんじゅん' } } },
    );

    // Act
    const message = await new RolePlayEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user copied たんじゅん!');
    expect(get(1).volatileState.abilityOverride).toBe('たんじゅん');
    expect(get(2).volatileState.abilityOverride).toBe('たんじゅん');
  });

  it('いえきで消された相手の特性も写す（消されているかは見ない）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      { ability: 'ふみん' },
      { ability: 'たんじゅん', status: { volatileState: { abilitySuppressed: true } } },
    );

    // Act
    const message = await new RolePlayEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user copied たんじゅん!');
    expect(get(1).volatileState.abilityOverride).toBe('たんじゅん');
  });

  it.each([
    ['相手と同じ特性', { ability: 'たんじゅん' }, { ability: 'たんじゅん' }],
    [
      '相手の特性が写せない特性（ふしぎなまもり）',
      { ability: 'ふみん' },
      { ability: 'ふしぎなまもり' },
    ],
    [
      '使用者の特性が消せない特性（バトルスイッチ）',
      { ability: 'バトルスイッチ' },
      { ability: 'たんじゅん' },
    ],
    ['相手に特性がない', { ability: 'ふみん' }, {}],
  ])('%sなら失敗する', async (_label, first, second) => {
    // Arrange
    const { context, get } = createInMemoryBattle(first, second);

    // Act
    const message = await new RolePlayEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
  });
});
