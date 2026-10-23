import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';

/**
 * 持ち主は ID 1、相手は ID 2。バトルのターンは 1
 */
describe('PickupEffect（ものひろい）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  const effect = () => AbilityRegistry.get('ものひろい')!;

  it('相手がこのターンに使い切った持ち物を拾い、相手の使い切った持ち物を消す', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle(
      { ability: 'ものひろい' },
      {
        status: {
          volatileState: { itemConsumedTurn: 1 },
          persistentState: { consumedItem: 'オボンのみ' },
        },
      },
    );

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBe('オボンのみ');
    expect(get(2).persistentState.consumedItem).toBeUndefined();
  });

  it('前のターンに使い切った持ち物は拾わない', async () => {
    // Arrange
    const { get, context, battleRepository } = createInMemoryBattle(
      { ability: 'ものひろい' },
      {
        status: {
          volatileState: { itemConsumedTurn: 1 },
          persistentState: { consumedItem: 'オボンのみ' },
        },
      },
    );
    await battleRepository.update(1, { turn: 2 });

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBeUndefined();
    expect(get(2).persistentState.consumedItem).toBe('オボンのみ');
  });

  it('自分が持ち物を持っていれば拾わない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle(
      { ability: 'ものひろい', status: { persistentState: { item: 'たべのこし' } } },
      {
        status: {
          volatileState: { itemConsumedTurn: 1 },
          persistentState: { consumedItem: 'オボンのみ' },
        },
      },
    );

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBe('たべのこし');
    expect(get(2).persistentState.consumedItem).toBe('オボンのみ');
  });

  it('自分がこのターンに使い切った持ち物は拾わない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'ものひろい',
      status: {
        volatileState: { itemConsumedTurn: 1 },
        persistentState: { consumedItem: 'オボンのみ' },
      },
    });

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBeUndefined();
  });

  it('ひんしの相手が使い切った持ち物は拾わない', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle(
      { ability: 'ものひろい' },
      {
        status: {
          currentHp: 0,
          volatileState: { itemConsumedTurn: 1 },
          persistentState: { consumedItem: 'オボンのみ' },
        },
      },
    );

    // Act
    await effect().onTurnEnd?.(get(1), context());

    // Assert
    expect(get(1).persistentState.item).toBeUndefined();
  });
});
