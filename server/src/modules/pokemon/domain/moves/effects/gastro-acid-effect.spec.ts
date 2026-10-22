import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { GastroAcidEffect } from './gastro-acid-effect';

describe('GastroAcidEffect（いえき）', () => {
  it('相手の特性を消す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'たんじゅん' });

    // Act
    const message = await new GastroAcidEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe("The target's Ability was suppressed!");
    expect(get(2).volatileState.abilitySuppressed).toBe(true);
  });

  it('相手の特性が消せない特性（マルチタイプ）なら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'マルチタイプ' });

    // Act
    const message = await new GastroAcidEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.abilitySuppressed).toBeUndefined();
  });

  it('相手の特性がもう消されているなら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'たんじゅん', status: { volatileState: { abilitySuppressed: true } } },
    );

    // Act
    const message = await new GastroAcidEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
  });
});
