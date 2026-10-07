import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { SoakEffect } from './soak-effect';

describe('SoakEffect（みずびたし）', () => {
  it('相手のタイプをみずタイプだけにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['ほのお', 'ひこう'] });

    // Act
    const message = await new SoakEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('transformed into the みず type!');
    expect(get(2).volatileState.typeOverride).toEqual(['みず']);
  });

  it('相手がもうみずタイプだけなら失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { types: ['みず'] });

    // Act
    const message = await new SoakEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.typeOverride).toBeUndefined();
  });

  it('みずタイプに 3 つめのタイプ（ハロウィン）が足された相手には成功し、足されたタイプが消える', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { types: ['みず'], status: { volatileState: { addedType: 'ゴースト' } } },
    );

    // Act
    const message = await new SoakEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('transformed into the みず type!');
    expect(get(2).volatileState.typeOverride).toEqual(['みず']);
    expect(get(2).volatileState.addedType).toBeUndefined();
  });

  it('アルセウスのタイプは変えられず失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { nationalDex: 493 });

    // Act
    const message = await new SoakEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.typeOverride).toBeUndefined();
  });
});
