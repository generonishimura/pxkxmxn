import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { ReflectEffect } from './reflect-effect';

describe('ReflectEffect（リフレクター）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('自分の陣営に残り 5 ターンのリフレクターを張る', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new ReflectEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ reflectTurns: 5 });
    expect(getSideConditions(battle.sideState, 2)).toEqual({});
    expect(message).toBe('Reflect made the team stronger against physical moves!');
  });

  it('すでに自分の陣営に張っていれば失敗し、残りターン数は変わらない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { reflectTurns: 2 });

    // Act
    const message = await new ReflectEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ reflectTurns: 2 });
    expect(message).toBe('But it failed');
  });

  it('相手の陣営に張られていても、自分の陣営には張れる', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 2, { reflectTurns: 3 });

    // Act
    const message = await new ReflectEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ reflectTurns: 5 });
    expect(getSideConditions(battle.sideState, 2)).toEqual({ reflectTurns: 3 });
    expect(message).toBe('Reflect made the team stronger against physical moves!');
  });
});
