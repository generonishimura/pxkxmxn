import { ElectricSurgeEffect } from './electric-surge-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import {
  Battle,
  BattleStatus,
  Field,
  Weather,
} from '@/modules/battle/domain/entities/battle.entity';

describe('ElectricSurgeEffect', () => {
  const pokemon = new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (field: Field): BattleContext => {
    const mockBattleRepository = {
      update: jest.fn().mockResolvedValue(undefined),
      findById: jest.fn().mockResolvedValue(null),
      patchGlobalFieldState: jest.fn(),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, field, BattleStatus.Active, null),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  let effect: ElectricSurgeEffect;

  beforeEach(() => {
    effect = new ElectricSurgeEffect();
  });

  it('場に出たときエレキフィールドを展開する', async () => {
    // Arrange
    const ctx = createCtx(Field.None);

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.update).toHaveBeenCalledWith(1, {
      field: Field.ElectricTerrain,
    });
  });

  it('場に出したフィールドの残りターン数 5 を書く', async () => {
    // Arrange
    const ctx = createCtx(Field.None);

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.patchGlobalFieldState).toHaveBeenCalledWith(1, {
      terrainTurns: 5,
    });
  });

  it('既にエレキフィールドの場合は更新しない', async () => {
    // Arrange
    const ctx = createCtx(Field.ElectricTerrain);

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.update).not.toHaveBeenCalled();
  });

  it('battleRepository が無い場合は何もしない', async () => {
    // Arrange
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, Weather.None, Field.None, BattleStatus.Active, null),
    };

    // Act & Assert
    await expect(effect.onEntry(pokemon, ctx)).resolves.toBeUndefined();
  });
});
