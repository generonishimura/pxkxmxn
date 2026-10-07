import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { TailwindEffect } from './tailwind-effect';

describe('TailwindEffect（おいかぜ）の かぜのり', () => {
  it('使い手が かぜのり なら、おいかぜが吹いたときに攻撃が1段階上がる', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'かぜのり' });

    // Act
    const message = await new TailwindEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(1);
    expect(message).toBe('The Tailwind blew from behind your team! Attack rose!');
  });

  it('おいかぜがすでに吹いていて失敗したときは、かぜのり でも攻撃は上がらない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle({ ability: 'かぜのり' });
    await battleRepository.patchSideConditions(1, 1, { tailwindTurns: 2 });

    // Act
    const message = await new TailwindEffect().onUse(get(1), get(2), context());

    // Assert
    expect(message).toBe('But it failed');
    expect(get(1).attackRank).toBe(0);
  });

  it('使い手が かぜのり でなければ、攻撃は上がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({ ability: 'いかく' });

    // Act
    const message = await new TailwindEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(0);
    expect(message).toBe('The Tailwind blew from behind your team!');
  });

  it('使い手の特性が いえき で消されていれば、かぜのり でも攻撃は上がらない', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      ability: 'かぜのり',
      status: { volatileState: { abilitySuppressed: true } },
    });

    // Act
    const message = await new TailwindEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(0);
    expect(message).toBe('The Tailwind blew from behind your team!');
  });

  it('攻撃ランクが+6なら上がらず、おいかぜのメッセージだけを返す', async () => {
    // Arrange
    const { context, get } = createInMemoryBattle({
      ability: 'かぜのり',
      status: { attackRank: 6 },
    });

    // Act
    const message = await new TailwindEffect().onUse(get(1), get(2), context());

    // Assert
    expect(get(1).attackRank).toBe(6);
    expect(message).toBe('The Tailwind blew from behind your team!');
  });
});
