import { FlowerShieldEffect } from './flower-shield-effect';
import { BattlePokemonStatus } from '@/modules/battle/domain/entities/battle-pokemon-status.entity';
import { BattleContext } from '@/modules/pokemon/domain/abilities/battle-context.interface';
import { Battle, BattleStatus } from '@/modules/battle/domain/entities/battle.entity';

describe('FlowerShieldEffect', () => {
  const createBattlePokemonStatus = (id: number): BattlePokemonStatus =>
    new BattlePokemonStatus(id, 1, id, id, true, 100, 100, 0, 0, 0, 0, 0, 0, 0, null);

  const createBattleContext = (primaryTypeName: string): BattleContext => ({
    battle: new Battle(1, 1, 2, 1, 2, 1, null, null, BattleStatus.Active, null),
    battleRepository: {
      updateBattlePokemonStatus: jest.fn().mockResolvedValue(undefined),
    } as unknown as BattleContext['battleRepository'],
    trainedPokemonRepository: {
      findById: jest.fn().mockResolvedValue({
        id: 1,
        pokemon: { id: 1, primaryType: { name: primaryTypeName }, secondaryType: null },
        ability: null,
      }),
    } as unknown as BattleContext['trainedPokemonRepository'],
  });

  it('くさタイプのポケモンの防御を1段階上げる', async () => {
    // Arrange
    const effect = new FlowerShieldEffect();
    const attacker = createBattlePokemonStatus(1);
    const defender = createBattlePokemonStatus(2);
    const ctx = createBattleContext('くさ');

    // Act
    const result = await effect.onUse(attacker, defender, ctx);

    // Assert
    expect(result).toBe("user's Defense rose! target's Defense rose!");
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(attacker.id, {
      defenseRank: 1,
    });
    expect(ctx.battleRepository?.updateBattlePokemonStatus).toHaveBeenCalledWith(defender.id, {
      defenseRank: 1,
    });
  });

  it('くさタイプがいないときは失敗し、null を返す', async () => {
    // Arrange
    const effect = new FlowerShieldEffect();
    const ctx = createBattleContext('フェアリー');

    // Act
    const result = await effect.onUse(
      createBattlePokemonStatus(1),
      createBattlePokemonStatus(2),
      ctx,
    );

    // Assert
    expect(result).toBeNull();
    expect(ctx.battleRepository?.updateBattlePokemonStatus).not.toHaveBeenCalled();
  });
});
