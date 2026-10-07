import { Weather } from '@/modules/battle/domain/entities/battle.entity';
import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { TailwindEffect } from './tailwind-effect';
import { AuroraVeilEffect } from './aurora-veil-effect';
import { LuckyChantEffect } from './lucky-chant-effect';

describe.each([
  ['おいかぜ', () => new TailwindEffect(), 'tailwindTurns', 4],
  ['オーロラベール', () => new AuroraVeilEffect(), 'auroraVeilTurns', 5],
  ['おまじない', () => new LuckyChantEffect(), 'luckyChantTurns', 5],
] as const)('%s', (_name, createEffect, key, turns) => {
  it(`自分の陣営にだけ ${turns} ターンの状態を張る`, async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await createEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = await battleRepository.findById(1);
    expect(getSideConditions(battle!.sideState, 1)[key]).toBe(turns);
    expect(getSideConditions(battle!.sideState, 2)[key]).toBeUndefined();
    expect(message).not.toBe('But it failed');
  });

  it('すでに張っていれば失敗し、残りターン数は変わらない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { [key]: 2 });

    // Act
    const message = await createEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = await battleRepository.findById(1);
    expect(message).toBe('But it failed');
    expect(getSideConditions(battle!.sideState, 1)[key]).toBe(2);
  });
});

describe('オーロラベール の天候の条件', () => {
  it('あられ（ゆきの代わり）のときは失敗しない', () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const result = new AuroraVeilEffect().shouldFail(
      get(1),
      get(2),
      context({ weather: Weather.Hail }),
    );

    // Assert
    expect(result).toBe(false);
  });

  it.each([Weather.Sun, Weather.Rain, Weather.Sandstorm, Weather.None])(
    '天候が %s のときは失敗する',
    weather => {
      // Arrange
      const { context, get } = createInMemoryBattle();

      // Act
      const result = new AuroraVeilEffect().shouldFail(get(1), get(2), context({ weather }));

      // Assert
      expect(result).toBe(true);
    },
  );

  it('天候がないときは失敗する', () => {
    // Arrange
    const { context, get } = createInMemoryBattle();

    // Act
    const result = new AuroraVeilEffect().shouldFail(get(1), get(2), context());

    // Assert
    expect(result).toBe(true);
  });
});
