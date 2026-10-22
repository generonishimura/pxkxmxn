import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { MoveRegistry } from '../move-registry';
import { GrudgeEffect } from './grudge-effect';

describe('GrudgeEffect（おんねん）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('使用者に grudge を書く（相手には書かない）', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new GrudgeEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).volatileState.grudge).toBe(true);
    expect(get(2).volatileState.grudge).toBeUndefined();
    expect(message).toBe('wants its target to bear a grudge!');
  });

  it('リポジトリがなければ失敗する', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const message = await new GrudgeEffect().onUse(
      get(1),
      get(2),
      context({ battleRepository: undefined }),
    );

    // Assert
    expect(message).toBe('But it failed');
  });

  it('DB の技名で登録されている', () => {
    // Arrange
    MoveRegistry.initialize();

    // Act
    const effect = MoveRegistry.get('おんねん');

    // Assert
    expect(effect).toBeInstanceOf(GrudgeEffect);
  });
});
