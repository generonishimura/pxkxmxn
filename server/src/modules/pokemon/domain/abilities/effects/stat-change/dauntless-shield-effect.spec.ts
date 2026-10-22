import { DauntlessShieldEffect } from './dauntless-shield-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('DauntlessShieldEffect', () => {
  const createPokemon = (defenseRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, 0, defenseRank, 0, 0, 0, 0, 0, null);

  const createCtx = (): BattleContext => {
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  let effect: DauntlessShieldEffect;

  beforeEach(() => {
    effect = new DauntlessShieldEffect();
  });

  it('場に出たとき自分の防御ランクを 1 段階上げる', async () => {
    // Arrange
    const pokemon = createPokemon(0);
    const ctx = createCtx();

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
      defenseRank: 1,
    });
  });

  it('下がっている防御ランクからも 1 段階上げる', async () => {
    // Arrange
    const pokemon = createPokemon(-2);
    const ctx = createCtx();

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
      defenseRank: -1,
    });
  });

  it('battleRepository が無い場合は何もしない', async () => {
    // Arrange
    const pokemon = createPokemon(0);
    const ctx: BattleContext = {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    };

    // Act & Assert
    await expect(effect.onEntry(pokemon, ctx)).resolves.toBeUndefined();
  });
});
