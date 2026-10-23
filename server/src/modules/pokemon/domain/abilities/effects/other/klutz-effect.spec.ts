import { AbilityRegistry } from '../../ability-registry';
import { ItemRegistry } from '../../../items/item-registry';
import { createInMemoryBattle } from '../../../battle-events/__tests__/in-memory-battle';
import { getItemEffect } from '../../../battle-events/item-lookup';
import { setAbility } from '../../../battle-events/ability-change';

describe('KlutzEffect（ぶきよう）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
    ItemRegistry.initialize();
  });

  it('場に出たら volatileState.klutz を書き、持ち物の効果がなくなる', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'ぶきよう',
      status: { persistentState: { item: 'たべのこし' } },
    });

    // Act
    await AbilityRegistry.get('ぶきよう')?.onEntry?.(get(1), context());

    // Assert
    expect(get(1).volatileState.klutz).toBe(true);
    expect(getItemEffect(get(1))).toBeUndefined();
  });

  it('スキルスワップなどでぶきようを得たら、持ち物の効果がなくなる', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'いかく',
      status: { persistentState: { item: 'たべのこし' } },
    });

    // Act
    await setAbility(get(1), 'ぶきよう', context());

    // Assert
    expect(get(1).volatileState.klutz).toBe(true);
  });

  it('ぶきようでなくなったら、持ち物の効果が戻る', async () => {
    // Arrange
    const { get, context } = createInMemoryBattle({
      ability: 'ぶきよう',
      status: { volatileState: { klutz: true }, persistentState: { item: 'たべのこし' } },
    });

    // Act
    await setAbility(get(1), 'いかく', context());

    // Assert
    expect(get(1).volatileState.klutz).toBeUndefined();
    expect(getItemEffect(get(1))).toBe(ItemRegistry.get('たべのこし'));
  });
});
