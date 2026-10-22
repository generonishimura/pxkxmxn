import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState, getSideConditions } from '@/modules/battle/domain/state/side-state';
import { AbilityRegistry } from '../../abilities/ability-registry';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { DefogEffect } from './defog-effect';

describe('DefogEffect（きりばらい）', () => {
  beforeEach(() => {
    AbilityRegistry.clear();
    AbilityRegistry.initialize();
  });

  it('相手の回避を下げ、相手の壁・守りと両方の設置技とフィールドを消す', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.patchSideConditions(1, 1, { spikesLayers: 1, tailwindTurns: 2 });
    await battleRepository.patchSideConditions(1, 2, {
      reflectTurns: 3,
      safeguardTurns: 2,
      stealthRock: true,
      wish: { turns: 1, healAmount: 50 },
    });
    await battleRepository.update(1, { field: Field.GrassyTerrain });
    await battleRepository.patchGlobalFieldState(1, { terrainTurns: 3 });

    // Act
    const message = await new DefogEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(get(2).evasionRank).toBe(-1);
    expect(getSideConditions(battle.sideState, 1)).toEqual({ tailwindTurns: 2 });
    expect(getSideConditions(battle.sideState, 2)).toEqual({ wish: { turns: 1, healAmount: 50 } });
    expect(battle.field).toBe(Field.None);
    expect(getGlobalFieldState(battle.sideState).terrainTurns).toBeUndefined();
    expect(message).toBe('Evasion fell! The field was cleared by the fog!');
  });
});
