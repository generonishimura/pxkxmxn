import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { SkillSwapEffect } from './skill-swap-effect';

describe('SkillSwapEffect（スキルスワップ）', () => {
  it('使用者と相手の今の特性を入れ替える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'ふみん' }, { ability: 'たんじゅん' });

    // Act
    const message = await new SkillSwapEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user swapped Abilities with its target!');
    expect(get(1).volatileState.abilityOverride).toBe('たんじゅん');
    expect(get(2).volatileState.abilityOverride).toBe('ふみん');
  });

  it('同じ特性どうしでも入れ替えられる（第 9 世代）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'ふみん' }, { ability: 'ふみん' });

    // Act
    const message = await new SkillSwapEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The user swapped Abilities with its target!');
  });

  it.each([
    ['使用者', { ability: 'ふしぎなまもり' }, { ability: 'ふみん' }],
    ['相手', { ability: 'ふみん' }, { ability: 'ふしぎなまもり' }],
  ])('%sの特性が入れ替えられない特性なら失敗する', async (_label, first, second) => {
    // Arrange
    const { context, get } = createInMemoryBattle(first, second);

    // Act
    const message = await new SkillSwapEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).volatileState.abilityOverride).toBeUndefined();
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
  });
});
