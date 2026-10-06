import { IntrepidSwordEffect } from './intrepid-sword-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '../../battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('IntrepidSwordEffect', () => {
  const createPokemon = (attackRank: number): BattlePokemonStatus =>
    new BattlePokemonStatus(1, 1, 1, 1, true, 100, 100, attackRank, 0, 0, 0, 0, 0, 0, null);

  const createCtx = (): BattleContext => {
    const mockBattleRepository = {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    };
    return {
      battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
      battleRepository: mockBattleRepository as unknown as BattleContext['battleRepository'],
    };
  };

  let effect: IntrepidSwordEffect;

  beforeEach(() => {
    effect = new IntrepidSwordEffect();
  });

  it('場に出たとき自分の攻撃ランクを 1 段階上げる', async () => {
    // Arrange
    const pokemon = createPokemon(0);
    const ctx = createCtx();

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(1, {
      attackRank: 1,
    });
  });

  it('攻撃ランクは +6 を超えない', async () => {
    // Arrange
    const pokemon = createPokemon(6);
    const ctx = createCtx();

    // Act
    await effect.onEntry(pokemon, ctx);

    // Assert: ランクが変わらないので書き込まない
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
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
