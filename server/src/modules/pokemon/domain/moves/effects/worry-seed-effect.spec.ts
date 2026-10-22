import { StatusCondition } from '@/modules/battle/domain/entities/status-condition.enum';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { WorrySeedEffect } from './worry-seed-effect';

describe('WorrySeedEffect（なやみのタネ）', () => {
  it('相手の特性をふみんにする', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({}, { ability: 'たんじゅん' });

    // Act
    const message = await new WorrySeedEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The target acquired ふみん!');
    expect(get(2).volatileState.abilityOverride).toBe('ふみん');
  });

  it('ねむっている相手は目を覚ます', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability: 'たんじゅん', status: { statusCondition: StatusCondition.Sleep } },
    );

    // Act
    const message = await new WorrySeedEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('The target acquired ふみん! The target woke up!');
    expect(get(2).statusCondition).toBe(StatusCondition.None);
  });

  it.each([
    ['ふみん', 'ふみん'],
    ['なまけ', 'なまけ'],
    ['消せない特性（ぜったいねむり）', 'ぜったいねむり'],
  ])('相手の特性が%sなら失敗する', async (_label, ability) => {
    // Arrange
    const { context, get } = createInMemoryBattle(
      {},
      { ability, status: { statusCondition: StatusCondition.Sleep } },
    );

    // Act
    const message = await new WorrySeedEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(2).volatileState.abilityOverride).toBeUndefined();
    expect(get(2).statusCondition).toBe(StatusCondition.Sleep);
  });
});
