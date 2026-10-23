import { ItemRegistry } from '../items/item-registry';
import { runItemUpdate } from './item-lookup';
import { createInMemoryBattle } from './__tests__/in-memory-battle';

describe('runItemUpdate（持ち物の onUpdate を呼ぶ）', () => {
  beforeEach(() => {
    ItemRegistry.initialize();
  });

  it('持ち物の onUpdate に、読み直した最新の持ち主を渡してメッセージを返す', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue('テストの持ち物が働いた');
    ItemRegistry.register('テストの持ち物', { onUpdate });
    const { context, get, battleRepository } = createInMemoryBattle({
      status: { persistentState: { item: 'テストの持ち物' } },
    });
    const stale = get(1);
    await battleRepository.updateBattlePokemonStatus(1, { currentHp: 40 });

    // Act
    const message = await runItemUpdate(stale, context());

    // Assert
    expect(message).toBe('テストの持ち物が働いた');
    expect(onUpdate.mock.calls[0][0].currentHp).toBe(40);
  });

  it('持ち主がひんしなら呼ばない', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue('働いた');
    ItemRegistry.register('テストの持ち物', { onUpdate });
    const { context, get } = createInMemoryBattle({
      status: { currentHp: 0, persistentState: { item: 'テストの持ち物' } },
    });

    // Act
    const message = await runItemUpdate(get(1), context());

    // Assert
    expect(message).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('持ち主が場にいなければ呼ばない', async () => {
    // Arrange
    const onUpdate = jest.fn().mockResolvedValue('働いた');
    ItemRegistry.register('テストの持ち物', { onUpdate });
    const { context, get } = createInMemoryBattle({
      status: { isActive: false, persistentState: { item: 'テストの持ち物' } },
    });

    // Act
    const message = await runItemUpdate(get(1), context());

    // Assert
    expect(message).toBeNull();
    expect(onUpdate).not.toHaveBeenCalled();
  });

  it('持ち物を持っていなければ、リポジトリを読まずに null を返す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await runItemUpdate(get(1), context());

    // Assert
    expect(message).toBeNull();
    expect(battleRepository.findBattlePokemonStatusById).not.toHaveBeenCalled();
  });
});
