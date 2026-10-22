import { Field } from '@/modules/battle/domain/entities/battle.entity';
import { getGlobalFieldState } from '@/modules/battle/domain/state/side-state';
import { createInMemoryBattle } from '../../battle-events/__tests__/in-memory-battle';
import { GrassyTerrainEffect } from './grassy-terrain-effect';

describe('GrassyTerrainEffect（グラスフィールド）', () => {
  it('フィールドをグラスフィールドにし、残りターン数を 5 にする', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();

    // Act
    const message = await new GrassyTerrainEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(battle.field).toBe(Field.GrassyTerrain);
    expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(5);
    expect(message).toBe('Grassy Terrain was set up!');
  });

  it('ほかのフィールドを上書きする', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.update(1, { field: Field.ElectricTerrain });
    await battleRepository.patchGlobalFieldState(1, { terrainTurns: 2 });

    // Act
    await new GrassyTerrainEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(battle.field).toBe(Field.GrassyTerrain);
    expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(5);
  });

  it('すでにグラスフィールドなら失敗し、残りターン数を延ばさない', async () => {
    // Arrange
    const { context, get, battleRepository } = createInMemoryBattle();
    await battleRepository.update(1, { field: Field.GrassyTerrain });
    await battleRepository.patchGlobalFieldState(1, { terrainTurns: 2 });

    // Act
    const message = await new GrassyTerrainEffect().onUse(get(1), get(2), context());

    // Assert
    const battle = (await battleRepository.findById(1))!;
    expect(getGlobalFieldState(battle.sideState).terrainTurns).toBe(2);
    expect(message).toBe('But it failed');
  });
});
