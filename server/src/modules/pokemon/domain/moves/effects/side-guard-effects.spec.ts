import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { MistEffect } from './mist-effect';
import { SafeguardEffect } from './safeguard-effect';

describe.each([
  ['しろいきり', () => new MistEffect(), 'mistTurns'],
  ['しんぴのまもり', () => new SafeguardEffect(), 'safeguardTurns'],
] as const)('%s', (_name, createEffect, key) => {
  it('自分の陣営に 5 ターンの守りを張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await createEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = await battleRepository.findById(1);
    expect(getSideConditions(battle!.sideState, 1)[key]).toBe(5);
    expect(message).not.toBe('But it failed');
  });

  it('すでに張っていれば失敗する', async () => {
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
