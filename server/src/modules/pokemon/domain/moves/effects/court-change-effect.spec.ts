import { getSideConditions } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { CourtChangeEffect } from './court-change-effect';

describe('CourtChangeEffect（コートチェンジ）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('両方の陣営の壁・おいかぜ・設置技を残りターン数ごと入れ替える', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { reflectTurns: 3, tailwindTurns: 2 });
    await battleRepository.patchSideConditions(1, 2, { spikesLayers: 2, stealthRock: true });

    // Act
    const message = await new CourtChangeEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ spikesLayers: 2, stealthRock: true });
    expect(getSideConditions(battle.sideState, 2)).toEqual({ reflectTurns: 3, tailwindTurns: 2 });
    expect(message).toBe('The user swapped the battle effects affecting each side of the field!');
  });

  it('片方の陣営にしかなくても入れ替える', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 2, { lightScreenTurns: 4 });

    // Act
    const message = await new CourtChangeEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ lightScreenTurns: 4 });
    expect(getSideConditions(battle.sideState, 2)).toEqual({});
    expect(message).toBe('The user swapped the battle effects affecting each side of the field!');
  });

  it('入れ替える状態がどちらの陣営にもなければ失敗する', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { wish: { turns: 1, healAmount: 50 } });

    // Act
    const message = await new CourtChangeEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getSideConditions(battle.sideState, 1)).toEqual({ wish: { turns: 1, healAmount: 50 } });
    expect(getSideConditions(battle.sideState, 2)).toEqual({});
    expect(message).toBe('But it failed');
  });
});
